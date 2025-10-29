export const paths = {
    apiPath: 'http://localhost:8000/api',
}

export const endpoints = {
    // Auth
    login: `${paths.apiPath}/auth/login/`,
    register: `${paths.apiPath}/auth/register/`,

    // Dashboard
    reports: `${paths.apiPath}/dashboard/stats/`,
    myReports: `${paths.apiPath}/dashboard/my-stats/`,

    // Users
    users: `${paths.apiPath}/users/`,

    // Incidents
    incidents: `${paths.apiPath}/incidents/`,
    createIncident: `${paths.apiPath}/incidents/create/`,
    updateIncident: `${paths.apiPath}/incidents/update/`,
    heatmap: `${paths.apiPath}/incidents/heatmap/`,

    // Profile 
    profile: `${paths.apiPath}/profile/`,
    updateProfile: `${paths.apiPath}/profile/update/`,
    changePassword: `${paths.apiPath}/profile/change-password/`,
}