@description('Name of the AI Foundry account')
param name string

@description('Azure region')
param location string

@description('Resource tags')
param tags object

@description('Array of model deployments to create')
param modelDeployments array

// ── Azure AI Services (Foundry resource) ───────────────────────
// kind: AIServices provides the multi-service Foundry resource
// that supports OpenAI models, Agent Service, and AI Foundry projects.

resource account 'Microsoft.CognitiveServices/accounts@2025-09-01' = {
  name: name
  location: location
  tags: tags
  kind: 'AIServices'
  sku: { name: 'S0' }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    allowProjectManagement: true
    customSubDomainName: name
    publicNetworkAccess: 'Enabled'
    disableLocalAuth: true
    networkAcls: {
      defaultAction: 'Allow'
      virtualNetworkRules: []
      ipRules: []
    }
  }
}

// ── Model Deployments ──────────────────────────────────────────
// Deployed sequentially via @batchSize(1) to avoid ARM conflicts

@batchSize(1)
resource modelDeployment 'Microsoft.CognitiveServices/accounts/deployments@2025-09-01' = [
  for model in modelDeployments: {
    parent: account
    name: model.deploymentName
    sku: {
      capacity: model.capacity
      name: model.skuName
    }
    properties: {
      model: {
        name: model.name
        format: model.format
        version: model.version
      }
    }
  }
]

output name string = account.name
output endpoint string = account.properties.endpoint
output id string = account.id
output principalId string = account.identity.principalId
