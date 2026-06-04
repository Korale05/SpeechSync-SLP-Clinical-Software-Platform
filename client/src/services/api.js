const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api';

// Helper to fetch JWT token
const getToken = () => localStorage.getItem('speechsync_token');

// Main request wrapper
async function request(endpoint, options = {}) {
  const token = getToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  if (options.responseType === 'blob') {
    return response.blob();
  }

  return response.json();
}

export const api = {
  // Authentication Endpoints
  auth: {
    login: (email, password) => 
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    register: (userData) =>
      request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      }),
    changePassword: (currentPassword, newPassword) =>
      request('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
  },

  // Users Endpoints
  users: {
    getAll: () => request('/users'),
    create: (userData) =>
      request('/users', {
        method: 'POST',
        body: JSON.stringify(userData),
      }),
    update: (id, userData) =>
      request(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(userData),
      }),
    deactivate: (id) =>
      request(`/users/${id}/deactivate`, {
        method: 'PATCH',
      }),
    activate: (id) =>
      request(`/users/${id}/activate`, {
        method: 'PATCH',
      }),
    resetPassword: (id) =>
      request(`/users/${id}/reset-password`, {
        method: 'POST',
      }),
    assignPatients: (clinicianId, patientIds) =>
      request('/users/assign-patients', {
        method: 'POST',
        body: JSON.stringify({ clinicianId, patientIds }),
      }),
  },

  // Patients Endpoints
  patients: {
    getAll: (role, includeArchived = false) => 
      request(role ? `/patients?role=${role}&archived=${includeArchived}` : `/patients?archived=${includeArchived}`),
    getById: (id) => request(`/patients/${id}`),
    create: (patientData) =>
      request('/patients', {
        method: 'POST',
        body: JSON.stringify(patientData),
      }),
    update: (id, patientData) =>
      request(`/patients/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patientData),
      }),
    delete: (id) =>
      request(`/patients/${id}`, {
        method: 'DELETE',
      }),
    getClinicians: () => request('/patients/clinicians/all'),
  },

  // Sessions & SOAP Notes Endpoints
  sessions: {
    getAll: () => request('/sessions'),
    getById: (id) => request(`/sessions/${id}`),
    create: (sessionData) =>
      request('/sessions', {
        method: 'POST',
        body: JSON.stringify(sessionData),
      }),
    update: (id, sessionData) =>
      request(`/sessions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(sessionData),
      }),
    delete: (id) =>
      request(`/sessions/${id}`, {
        method: 'DELETE',
      }),
  },

  // Assessments Endpoints (Automated Scoring Engine)
  assessments: {
    getAll: () => request('/assessments'),
    create: (assessmentData) =>
      request('/assessments', {
        method: 'POST',
        body: JSON.stringify(assessmentData),
      }),
  },

  // Billing & Claims Endpoints
  billing: {
    getAll: () => request('/billing'),
    create: (claimData) =>
      request('/billing', {
        method: 'POST',
        body: JSON.stringify(claimData),
      }),
    update: (id, claimData) =>
      request(`/billing/${id}`, {
        method: 'PUT',
        body: JSON.stringify(claimData),
      }),
    scrub: (scrubData) =>
      request('/billing/scrub', {
        method: 'POST',
        body: JSON.stringify(scrubData),
      }),
  },

  // Goals Endpoints
  goals: {
    getAll: () => request('/goals'),
    create: (goalData) =>
      request('/goals', {
        method: 'POST',
        body: JSON.stringify(goalData),
      }),
    updateProgress: (id, currentAccuracy) =>
      request(`/goals/${id}/progress`, {
        method: 'PUT',
        body: JSON.stringify({ currentAccuracy }),
      }),
  },

  // Appointments Endpoints
  appointments: {
    getAll: () => request('/appointments'),
    updateStatus: (id, status) =>
      request(`/appointments/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),
    create: (data) =>
      request('/appointments', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Messages Endpoints
  messages: {
    getHistory: (userId) => request(`/messages/history/${userId}`),
    sendMessage: (data) =>
      request('/messages', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    markRead: (id) =>
      request(`/messages/${id}/read`, {
        method: 'PUT',
      }),
  },

  // Exercises Endpoints (HEP Builder)
  exercises: {
    getAll: (patientId) => request(patientId ? `/exercises?patientId=${patientId}` : '/exercises'),
    assign: (data) =>
      request('/exercises', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateStatus: (id, completed) =>
      request(`/exercises/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ completed }),
      }),
  },

  // Audit Logs Endpoints
  auditLogs: {
    getAll: (page = 1, limit = 50) => request(`/audit-logs?page=${page}&limit=${limit}`),
  },

  // Reports (IEP & Progress PDF)
  reports: {
    getDownloadUrl: (patientId) => `${API_BASE_URL}/reports/iep/${patientId}`,
  },

  // Teletherapy Room Endpoints
  teletherapy: {
    createRoom: (sessionId) =>
      request('/teletherapy/create-room', {
        method: 'POST',
        body: JSON.stringify({ sessionId }),
      }),
  },
};

// Axios-like helper wrappers for generic calls returning { data }
api.get = async (endpoint, options = {}) => {
  const data = await request(endpoint, { method: 'GET', ...options });
  return { data };
};
api.post = async (endpoint, body, options = {}) => {
  const data = await request(endpoint, {
    method: 'POST',
    body: body ? (options.responseType === 'blob' ? body : JSON.stringify(body)) : undefined,
    ...options
  });
  return { data };
};
api.put = async (endpoint, body, options = {}) => {
  const data = await request(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
    ...options
  });
  return { data };
};
api.patch = async (endpoint, body, options = {}) => {
  const data = await request(endpoint, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
    ...options
  });
  return { data };
};
api.delete = async (endpoint, options = {}) => {
  const data = await request(endpoint, { method: 'DELETE', ...options });
  return { data };
};

export default api;


