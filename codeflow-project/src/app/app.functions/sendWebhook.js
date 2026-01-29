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
        codeflow_success: false,
        codeflow_error: 'Missing webhook URL'
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
        codeflow_success: true,
        codeflow_status_code: response.status,
        codeflow_error: ''
      }
    };
  } catch (error) {
    return {
      outputFields: {
        codeflow_success: false,
        codeflow_status_code: error.response?.status || 0,
        codeflow_error: error.message
      }
    };
  }
};
