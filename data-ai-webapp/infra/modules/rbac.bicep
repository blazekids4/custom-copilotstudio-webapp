@description('Principal ID of the AI Search managed identity')
param searchPrincipalId string

@description('Principal ID of the Container App managed identity')
param containerAppPrincipalId string

@description('Principal ID of the AI Foundry managed identity')
param foundryPrincipalId string

@description('Name of the storage account')
param storageAccountName string

@description('Name of the AI Foundry (Cognitive Services) account')
param openaiAccountName string

// ── Existing resources ──────────────────────────────────────────

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
}

resource openaiAccount 'Microsoft.CognitiveServices/accounts@2025-09-01' existing = {
  name: openaiAccountName
}

// ── Role Definition IDs ─────────────────────────────────────────

// Storage Blob Data Contributor — read/write blobs
var storageBlobDataContributorRoleId = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'

// Storage Blob Data Reader — read-only blobs
var storageBlobDataReaderRoleId = '2a2b9908-6ea1-4ae2-8e65-a410df84e7d1'

// Cognitive Services OpenAI Contributor — call OpenAI models
var cognitiveServicesOpenAIContributorRoleId = 'a001fd3d-188f-4b5d-821b-7da978bf7442'

// Cognitive Services OpenAI User — call OpenAI models (read-only)
var cognitiveServicesOpenAIUserRoleId = '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd'

// ── AI Search MI → Storage (read blobs for indexer) ─────────────

resource searchToStorageRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(searchPrincipalId, storageBlobDataReaderRoleId, storageAccount.id)
  scope: storageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageBlobDataReaderRoleId)
    principalId: searchPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// ── AI Search MI → OpenAI (call embedding model for skillset) ───

resource searchToOpenAIRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(searchPrincipalId, cognitiveServicesOpenAIUserRoleId, openaiAccount.id)
  scope: openaiAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', cognitiveServicesOpenAIUserRoleId)
    principalId: searchPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// ── Container App MI → Storage (upload/download files) ──────────

resource containerAppToStorageRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(containerAppPrincipalId, storageBlobDataContributorRoleId, storageAccount.id)
  scope: storageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageBlobDataContributorRoleId)
    principalId: containerAppPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// ── Container App MI → OpenAI (chat + embeddings) ───────────────

resource containerAppToOpenAIRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(containerAppPrincipalId, cognitiveServicesOpenAIContributorRoleId, openaiAccount.id)
  scope: openaiAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', cognitiveServicesOpenAIContributorRoleId)
    principalId: containerAppPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// ── Foundry MI → Storage (agent file access) ────────────────────

resource foundryToStorageRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(foundryPrincipalId, storageBlobDataContributorRoleId, storageAccount.id)
  scope: storageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageBlobDataContributorRoleId)
    principalId: foundryPrincipalId
    principalType: 'ServicePrincipal'
  }
}
