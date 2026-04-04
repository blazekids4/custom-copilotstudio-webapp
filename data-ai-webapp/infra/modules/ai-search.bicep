param name string
param location string
param tags object

resource searchService 'Microsoft.Search/searchServices@2024-03-01-preview' = {
  name: name
  location: location
  tags: tags
  sku: { name: 'basic' }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    replicaCount: 1
    partitionCount: 1
    hostingMode: 'default'
    semanticSearch: 'free'
  }
}

output name string = searchService.name
output endpoint string = 'https://${searchService.name}.search.windows.net'
output id string = searchService.id
output principalId string = searchService.identity.principalId
