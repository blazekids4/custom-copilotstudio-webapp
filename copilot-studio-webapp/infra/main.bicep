targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the environment (used to generate a unique resource name)')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string

// App secrets — set via `azd env set` before `azd up`
@secure()
param tenantId string
@secure()
param clientId string
@secure()
param clientSecret string
@secure()
param redirectUri string
@secure()
param copilotConnectionString string

param allowedOrigin string = ''

var abbrs = loadJsonContent('./abbreviations.json')
var resourceToken = toLower(uniqueString(subscription().id, environmentName, location))
var tags = { 'azd-env-name': environmentName }

resource rg 'Microsoft.Resources/resourceGroups@2022-09-01' = {
  name: '${abbrs.resourcesResourceGroups}${environmentName}'
  location: location
  tags: tags
}

module containerAppsEnv './modules/container-apps-environment.bicep' = {
  name: 'container-apps-environment'
  scope: rg
  params: {
    name: '${abbrs.appManagedEnvironments}${resourceToken}'
    location: location
    tags: tags
  }
}

module containerRegistry './modules/container-registry.bicep' = {
  name: 'container-registry'
  scope: rg
  params: {
    name: '${abbrs.containerRegistryRegistries}${resourceToken}'
    location: location
    tags: tags
  }
}

module web './modules/container-app.bicep' = {
  name: 'web'
  scope: rg
  params: {
    name: '${abbrs.appContainerApps}web-${resourceToken}'
    location: location
    tags: union(tags, { 'azd-service-name': 'web' })
    containerAppsEnvironmentName: containerAppsEnv.outputs.name
    containerRegistryName: containerRegistry.outputs.name
    env: [
      { name: 'TENANT_ID', secretRef: 'tenant-id' }
      { name: 'CLIENT_ID', secretRef: 'client-id' }
      { name: 'CLIENT_SECRET', secretRef: 'client-secret' }
      { name: 'REDIRECT_URI', secretRef: 'redirect-uri' }
      { name: 'COPILOT_CONNECTION_STRING', secretRef: 'copilot-connection-string' }
      { name: 'ALLOWED_ORIGIN', value: allowedOrigin }
      { name: 'PORT', value: '8080' }
    ]
    secrets: [
      { name: 'tenant-id', value: tenantId }
      { name: 'client-id', value: clientId }
      { name: 'client-secret', value: clientSecret }
      { name: 'redirect-uri', value: redirectUri }
      { name: 'copilot-connection-string', value: copilotConnectionString }
    ]
    targetPort: 8080
  }
}

output AZURE_CONTAINER_REGISTRY_ENDPOINT string = containerRegistry.outputs.loginServer
output WEB_URI string = web.outputs.uri
