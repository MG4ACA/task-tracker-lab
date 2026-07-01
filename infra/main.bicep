param location string = 'centralus'
param appName string = 'task-tracker'
param environment string = 'prod'

// App Service Plan — Free tier (F1)
resource appServicePlan 'Microsoft.Web/serverfarms@2022-03-01' = {
  name: '${appName}-plan-${environment}'
  location: location
  sku: {
    name: 'F1'
    tier: 'Free'
  }
}

// App Service — hosts the .NET API
resource appService 'Microsoft.Web/sites@2022-03-01' = {
  name: '${appName}-api-${environment}'
  location: location
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      netFrameworkVersion: 'v9.0'
      appSettings: [
        { name: 'ASPNETCORE_ENVIRONMENT', value: 'Production' }
      ]
    }
  }
}

// Static Web App — hosts the React frontend (Free tier)
resource staticWebApp 'Microsoft.Web/staticSites@2022-03-01' = {
  name: '${appName}-frontend-${environment}'
  location: 'eastus2'
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {}
}

output apiUrl string = 'https://${appService.properties.defaultHostName}'
output staticWebAppName string = staticWebApp.name
