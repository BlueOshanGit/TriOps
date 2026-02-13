const axios = require('axios');

exports.main = async (context = {}) => {
  const { inputFields, object, workflow } = context;

  const {
    webhookUrl,
    webhookMethod = 'POST',
    webhookBody
  } = inputFields || {};

  if (!webhookUrl) {
    return {
      outputFields: {
        hubhacks_success: false,
        hubhacks_error: 'Missing webhook URL'
      }
    };
  }

  try {
    let body = webhookBody;
    if (typeof webhookBody === 'string') {
      try {
        body = JSON.parse(webhookBody);
      } catch {
        body = { data: webhookBody };
      }
    }

    // If no body provided, send object and workflow data
    if (!body) {
      body = { object, workflow };
    }

    const response = await axios({
      method: webhookMethod,
      url: webhookUrl,
      data: body,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    return {
      outputFields: {
        hubhacks_success: true,
        hubhacks_status_code: response.status,
        hubhacks_error: ''
      }
    };
  } catch (error) {
    return {
      outputFields: {
        hubhacks_success: false,
        hubhacks_status_code: error.response?.status || 0,
        hubhacks_error: error.message
      }
    };
  }
};
