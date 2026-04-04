"""One-time setup: creates AI Search index, data source, skillset, and indexer.

Run after `azd provision` to configure the integrated vectorization pipeline.

Blob path convention: {userId}/{fileId}/{fileName}
  - The indexer extracts userId from the first path segment
  - All search queries filter by userId for per-user isolation

Usage:
    python -m backend.setup_search
"""

import os
from dotenv import load_dotenv
from azure.identity import DefaultAzureCredential
from azure.search.documents.indexes import SearchIndexClient, SearchIndexerClient
from azure.search.documents.indexes.models import (
    SearchIndex,
    SearchField,
    SearchFieldDataType,
    SimpleField,
    SearchableField,
    VectorSearch,
    HnswAlgorithmConfiguration,
    VectorSearchProfile,
    SearchIndexerDataSourceConnection,
    SearchIndexerDataContainer,
    SearchIndexer,
    SearchIndexerSkillset,
    IndexingSchedule,
    FieldMapping,
    SearchIndexerIndexProjectionSelector,
    SearchIndexerIndexProjections,
    SearchIndexerIndexProjectionsParameters,
    InputFieldMappingEntry,
    OutputFieldMappingEntry,
    SplitSkill,
    AzureOpenAIEmbeddingSkill,
)

load_dotenv()

SEARCH_ENDPOINT = os.environ["AZURE_SEARCH_ENDPOINT"]
STORAGE_ACCOUNT_URL = os.environ["AZURE_STORAGE_ACCOUNT_URL"]
STORAGE_CONTAINER = os.environ.get("AZURE_STORAGE_CONTAINER", "uploads")
OPENAI_ENDPOINT = os.environ["AZURE_OPENAI_ENDPOINT"]
EMBEDDING_DEPLOYMENT = os.environ.get("AZURE_OPENAI_EMBEDDING_DEPLOYMENT", "text-embedding-3-large")
INDEX_NAME = os.environ.get("AZURE_SEARCH_INDEX", "documents")

credential = DefaultAzureCredential()


def create_index(client: SearchIndexClient):
    """Create the search index with vector field."""
    fields = [
        SimpleField(name="id", type=SearchFieldDataType.String, key=True, filterable=True),
        SimpleField(name="parent_id", type=SearchFieldDataType.String, filterable=True),
        SearchableField(name="content", type=SearchFieldDataType.String),
        SimpleField(name="fileName", type=SearchFieldDataType.String, filterable=True, facetable=True),
        SimpleField(name="userId", type=SearchFieldDataType.String, filterable=True),
        SimpleField(name="chunkIndex", type=SearchFieldDataType.Int32, filterable=True),
        SearchField(
            name="contentVector",
            type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
            searchable=True,
            vector_search_dimensions=1536,
            vector_search_profile_name="default-vector-profile",
        ),
    ]

    vector_search = VectorSearch(
        algorithms=[HnswAlgorithmConfiguration(name="default-hnsw")],
        profiles=[
            VectorSearchProfile(
                name="default-vector-profile",
                algorithm_configuration_name="default-hnsw",
            )
        ],
    )

    index = SearchIndex(name=INDEX_NAME, fields=fields, vector_search=vector_search)
    client.create_or_update_index(index)
    print(f"Index '{INDEX_NAME}' created/updated.")


def create_data_source(client: SearchIndexerClient):
    """Create a data source connection pointing to the Blob container."""
    data_source = SearchIndexerDataSourceConnection(
        name=f"{INDEX_NAME}-datasource",
        type="azureblob",
        connection_string=STORAGE_ACCOUNT_URL,
        container=SearchIndexerDataContainer(name=STORAGE_CONTAINER),
        identity={"@odata.type": "#Microsoft.Azure.Search.DataUserAssignedIdentity"}
        if False  # Using system-assigned MI — no explicit identity needed
        else None,
    )
    # For managed identity auth, use the resource ID format
    data_source.connection_string = f"ResourceId={STORAGE_ACCOUNT_URL.rstrip('/')}"
    client.create_or_update_data_source_connection(data_source)
    print(f"Data source '{data_source.name}' created/updated.")


def create_skillset(client: SearchIndexerClient):
    """Create a skillset with text splitting and embedding skills."""
    split_skill = SplitSkill(
        name="text-split",
        description="Split documents into chunks",
        text_split_mode="pages",
        context="/document",
        maximum_page_length=2000,
        page_overlap_length=200,
        inputs=[InputFieldMappingEntry(name="text", source="/document/content")],
        outputs=[OutputFieldMappingEntry(name="textItems", target_name="chunks")],
    )

    embedding_skill = AzureOpenAIEmbeddingSkill(
        name="embedding",
        description="Generate embeddings for chunks",
        context="/document/chunks/*",
        resource_url=OPENAI_ENDPOINT,
        deployment_name=EMBEDDING_DEPLOYMENT,
        model_name=EMBEDDING_DEPLOYMENT,
        inputs=[InputFieldMappingEntry(name="text", source="/document/chunks/*")],
        outputs=[OutputFieldMappingEntry(name="embedding", target_name="contentVector")],
    )

    skillset = SearchIndexerSkillset(
        name=f"{INDEX_NAME}-skillset",
        description="Extract, chunk, and embed documents",
        skills=[split_skill, embedding_skill],
        index_projections=SearchIndexerIndexProjections(
            selectors=[
                SearchIndexerIndexProjectionSelector(
                    target_index_name=INDEX_NAME,
                    parent_key_field_name="parent_id",
                    source_context="/document/chunks/*",
                    mappings=[
                        InputFieldMappingEntry(name="content", source="/document/chunks/*"),
                        InputFieldMappingEntry(name="contentVector", source="/document/chunks/*/contentVector"),
                        InputFieldMappingEntry(name="fileName", source="/document/metadata_storage_name"),
                        InputFieldMappingEntry(name="userId", source="/document/userId"),
                    ],
                )
            ],
            parameters=SearchIndexerIndexProjectionsParameters(
                projection_mode="generatedKeyAsId"
            ),
        ),
    )

    client.create_or_update_skillset(skillset)
    print(f"Skillset '{skillset.name}' created/updated.")


def create_indexer(client: SearchIndexerClient):
    """Create an indexer that runs the full pipeline on a schedule.

    Blob path convention: {userId}/{fileId}/{fileName}
    userId is also stored as blob metadata and mapped directly to the index
    via metadata_storage_metadata_userId — no custom skill needed.
    """
    indexer = SearchIndexer(
        name=f"{INDEX_NAME}-indexer",
        data_source_name=f"{INDEX_NAME}-datasource",
        target_index_name=INDEX_NAME,
        skillset_name=f"{INDEX_NAME}-skillset",
        schedule=IndexingSchedule(interval="PT1H"),  # Run every hour
        field_mappings=[
            FieldMapping(
                source_field_name="metadata_storage_path",
                mapping_function={"name": "base64Encode"},
                target_field_name="id",
            ),
            FieldMapping(
                source_field_name="metadata_storage_name",
                target_field_name="fileName",
            ),
            # Map userId from blob custom metadata
            FieldMapping(
                source_field_name="metadata_storage_metadata_userId",
                target_field_name="userId",
            ),
        ],
        parameters={
            "configuration": {
                "dataToExtract": "contentAndMetadata",
                "parsingMode": "default",
                "imageAction": "none",
            }
        },
    )

    client.create_or_update_indexer(indexer)
    print(f"Indexer '{indexer.name}' created/updated.")


def main():
    index_client = SearchIndexClient(endpoint=SEARCH_ENDPOINT, credential=credential)
    indexer_client = SearchIndexerClient(endpoint=SEARCH_ENDPOINT, credential=credential)

    print(f"Configuring AI Search at {SEARCH_ENDPOINT}...")
    create_index(index_client)
    create_data_source(indexer_client)
    create_skillset(indexer_client)
    create_indexer(indexer_client)
    print("\nDone. The indexer will process documents in the blob container automatically.")
    print("To trigger immediately: az search indexer run --name documents-indexer --service-name <search-service>")


if __name__ == "__main__":
    main()
