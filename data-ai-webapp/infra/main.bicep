@minLength(1)
@maxLength(64)
@description('Name of the environment (used to generate resource names)')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string

@description('Array of model deployments to create on the AI Foundry resource')
param modelDeployments array

@description('Default chat model deployment name (used by backend)')
param chatModelDeploymentName string = 'gpt-4-1'

@description('Default embedding model deployment name (used by backend)')
param embeddingModelDeploymentName string = 'text-embedding-3-large'

// ── Derived names ──────────────────────────────────────────────

var abbrs = loadJsonContent('./abbreviations.json')
var resourceToken = toLower(uniqueString(subscription().id, environmentName, location))
var tags = { 'azd-env-name': environmentName, SecurityControl: 'Ignore' }

// ── Container Apps Environment ─────────────────────────────────

module containerAppsEnvironment 'modules/container-apps-environment.bicep' = {
  name: 'container-apps-environment'
  params: {
    name: '${abbrs.appManagedEnvironments}${resourceToken}'
    location: location
    tags: tags
    logAnalyticsWorkspaceName: '${abbrs.operationalInsightsWorkspaces}${resourceToken}'
  }
}

// ── Container Registry ─────────────────────────────────────────

module containerRegistry 'modules/container-registry.bicep' = {
  name: 'container-registry'
  params: {
    name: '${abbrs.containerRegistryRegistries}${resourceToken}'
    location: location
    tags: tags
  }
}

// ── Storage Account ────────────────────────────────────────────

module storage 'modules/storage.bicep' = {
  name: 'storage'
  params: {
    name: '${abbrs.storageStorageAccounts}${resourceToken}'
    location: location
    tags: tags
    containerName: 'uploads'
  }
}

// ── Cosmos DB ──────────────────────────────────────────────────

module cosmos 'modules/cosmos-db.bicep' = {
  name: 'cosmos-db'
  params: {
    name: '${abbrs.documentDBDatabaseAccounts}${resourceToken}'
    location: location
    tags: tags
    databaseName: 'appdb'
    containerNames: ['conversations', 'files']
  }
}

// ── Azure AI Search ────────────────────────────────────────────

module search 'modules/ai-search.bicep' = {
  name: 'ai-search'
  params: {
    name: '${abbrs.searchSearchServices}${resourceToken}'
    location: location
    tags: tags
  }
}

// ── Azure OpenAI ───────────────────────────────────────────────

module openai 'modules/openai.bicep' = {
  name: 'openai'
  params: {
    name: '${abbrs.cognitiveServicesAccounts}${resourceToken}'
    location: location
    tags: tags
    modelDeployments: modelDeployments
  }
}

// ── Static Web App ─────────────────────────────────────────────

module staticWebApp 'modules/static-web-app.bicep' = {
  name: 'static-web-app'
  params: {
    name: '${abbrs.webStaticSites}${resourceToken}'
    location: location
    tags: tags
  }
}

// ── Container App (backend) ────────────────────────────────────

module containerApp 'modules/container-app.bicep' = {
  name: 'container-app'
  params: {
    name: '${abbrs.appContainerApps}api-${resourceToken}'
    location: location
    tags: union(tags, { 'azd-service-name': 'api' })
    containerAppsEnvironmentName: containerAppsEnvironment.outputs.name
    containerRegistryName: containerRegistry.outputs.name
    env: [
      { name: 'AZURE_STORAGE_ACCOUNT_URL', value: storage.outputs.endpoint }
      { name: 'AZURE_STORAGE_CONTAINER', value: 'uploads' }
      { name: 'AZURE_SEARCH_ENDPOINT', value: search.outputs.endpoint }
      { name: 'AZURE_SEARCH_INDEX', value: 'documents' }
      { name: 'AZURE_COSMOS_ENDPOINT', value: cosmos.outputs.endpoint }
      { name: 'AZURE_COSMOS_DATABASE', value: 'appdb' }
      { name: 'AZURE_OPENAI_ENDPOINT', value: openai.outputs.endpoint }
      { name: 'AZURE_OPENAI_CHAT_DEPLOYMENT', value: chatModelDeploymentName }
      { name: 'AZURE_OPENAI_EMBEDDING_DEPLOYMENT', value: embeddingModelDeploymentName }
      { name: 'FOUNDRY_PROJECT_ENDPOINT', value: openai.outputs.endpoint }
    ]
  }
}

// ── RBAC — Managed Identity Role Assignments ───────────────────

module rbac 'modules/rbac.bicep' = {
  name: 'rbac'
  dependsOn: [storage, search, openai, containerApp]
  params: {
    searchPrincipalId: search.outputs.principalId
    containerAppPrincipalId: containerApp.outputs.identityPrincipalId
    foundryPrincipalId: openai.outputs.principalId
    storageAccountName: storage.outputs.name
    openaiAccountName: openai.outputs.name
  }
}

// ── Outputs ────────────────────────────────────────────────────
output AZURE_CONTAINER_REGISTRY_NAME string = containerRegistry.outputs.name
output AZURE_CONTAINER_REGISTRY_ENDPOINT string = containerRegistry.outputs.loginServer
output AZURE_CONTAINER_APP_URL string = containerApp.outputs.uri
output AZURE_STATIC_WEB_APP_URL string = staticWebApp.outputs.defaultHostname
output AZURE_STORAGE_ACCOUNT_URL string = storage.outputs.endpoint
output AZURE_COSMOS_ENDPOINT string = cosmos.outputs.endpoint
output AZURE_SEARCH_ENDPOINT string = search.outputs.endpoint
output AZURE_OPENAI_ENDPOINT string = openai.outputs.endpoint
output FOUNDRY_RESOURCE_ID string = openai.outputs.id
output FOUNDRY_PRINCIPAL_ID string = openai.outputs.principalId
