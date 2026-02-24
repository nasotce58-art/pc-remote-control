// Cloudflare Worker for PC Remote Control
// Handles command routing via KV Storage with long polling

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route: POST /command - Send command
      if (pathname === '/command' && method === 'POST') {
        return handlePostCommand(request, env, corsHeaders);
      }

      // Route: GET /commands/:deviceId - Get commands for device (long polling)
      if (pathname.match(/^\/commands\/[\w-]+$/) && method === 'GET') {
        return handleGetCommands(url, env, corsHeaders);
      }

      // Route: POST /result - Send command result
      if (pathname === '/result' && method === 'POST') {
        return handlePostResult(request, env, corsHeaders);
      }

      // Route: GET /result/:commandId - Get result for command
      if (pathname.match(/^\/result\/[\w-]+$/) && method === 'GET') {
        return handleGetResult(url, env, corsHeaders);
      }

      // Route: GET /health - Health check
      if (pathname === '/health' && method === 'GET') {
        return new Response(JSON.stringify({ status: 'ok' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // 404
      return new Response(JSON.stringify({ ok: false, error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Worker error:', errorMessage, error);
      return new Response(JSON.stringify({ ok: false, error: errorMessage }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }
};

// Handler: POST /command - Send command to device
async function handlePostCommand(request, env, corsHeaders) {
  try {
    const body = await request.json();
    const { deviceId, command, delay, userId } = body;

    if (!deviceId || !command) {
      return errorResponse(400, 'Missing deviceId or command', corsHeaders);
    }

    // Generate command ID
    const commandId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create command object
    const commandObj = {
      id: commandId,
      deviceId: deviceId,
      command: command,
      delay: delay || null,
      userId: userId || null,
      timestamp: new Date().toISOString(),
      executed: false,
      result: null
    };

    // Store command in KV
    const key = `commands:${deviceId}`;
    const commands = await getCommandsArray(env, key);
    commands.push(commandObj);

    // Keep only last 100 commands
    if (commands.length > 100) {
      commands.shift();
    }

    await env.COMMANDS.put(key, JSON.stringify(commands), {
      expirationTtl: 86400 // 24 hours
    });

    // Also store individual command for quick lookup
    await env.COMMANDS.put(`command:${commandId}`, JSON.stringify(commandObj), {
      expirationTtl: 86400
    });

    return successResponse({
      ok: true,
      commandId: commandId,
      message: 'Command queued'
    }, corsHeaders);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in handlePostCommand:', errorMessage);
    return errorResponse(500, errorMessage, corsHeaders);
  }
}

// Handler: GET /commands/:deviceId - Get commands for device (long polling)
async function handleGetCommands(url, env, corsHeaders) {
  try {
    const deviceId = url.pathname.split('/')[2];

    if (!deviceId) {
      return errorResponse(400, 'Missing deviceId', corsHeaders);
    }

    // Get commands for this device
    const key = `commands:${deviceId}`;
    const commands = await getCommandsArray(env, key);

    // Filter unexecuted commands
    const pending = commands.filter(cmd => !cmd.executed);

    // Mark as executed in KV (or delete)
    if (pending.length > 0) {
      const executed = commands.map(cmd => ({
        ...cmd,
        executed: true
      }));
      await env.COMMANDS.put(key, JSON.stringify(executed), {
        expirationTtl: 86400
      });
    }

    return successResponse({
      ok: true,
      commands: pending
    }, corsHeaders);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in handleGetCommands:', errorMessage);
    return errorResponse(500, errorMessage, corsHeaders);
  }
}

// Handler: POST /result - Store command result
async function handlePostResult(request, env, corsHeaders) {
  try {
    const body = await request.json();
    const { commandId, deviceId, success, result, timestamp } = body;

    if (!commandId || !deviceId) {
      return errorResponse(400, 'Missing commandId or deviceId', corsHeaders);
    }

    // Create result object
    const resultObj = {
      commandId: commandId,
      deviceId: deviceId,
      success: success || false,
      result: result || '',
      timestamp: timestamp || new Date().toISOString()
    };

    // Store in RESULTS namespace
    const resultKey = `result:${commandId}`;
    await env.RESULTS.put(resultKey, JSON.stringify(resultObj), {
      expirationTtl: 86400 // 24 hours
    });

    // Also append to device's result history
    const historyKey = `results:${deviceId}`;
    const history = await getResultsArray(env, historyKey);
    history.push(resultObj);

    // Keep only last 50 results
    if (history.length > 50) {
      history.shift();
    }

    await env.RESULTS.put(historyKey, JSON.stringify(history), {
      expirationTtl: 86400
    });

    return successResponse({
      ok: true,
      message: 'Result stored'
    }, corsHeaders);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in handlePostResult:', errorMessage);
    return errorResponse(500, errorMessage, corsHeaders);
  }
}

// Handler: GET /result/:commandId - Get result for command
async function handleGetResult(url, env, corsHeaders) {
  try {
    const commandId = url.pathname.split('/')[2];

    if (!commandId) {
      return errorResponse(400, 'Missing commandId', corsHeaders);
    }

    const resultKey = `result:${commandId}`;
    const resultJson = await env.RESULTS.get(resultKey);

    if (!resultJson) {
      return errorResponse(404, 'Result not found', corsHeaders);
    }

    const result = JSON.parse(resultJson);
    return successResponse({ ok: true, ...result }, corsHeaders);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in handleGetResult:', errorMessage);
    return errorResponse(500, errorMessage, corsHeaders);
  }
}

// Helper: Get commands array from KV
async function getCommandsArray(env, key) {
  try {
    const json = await env.COMMANDS.get(key);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

// Helper: Get results array from KV
async function getResultsArray(env, key) {
  try {
    const json = await env.RESULTS.get(key);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

// Helper: Success response
function successResponse(data, corsHeaders) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

// Helper: Error response
function errorResponse(status, message, corsHeaders) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status: status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}
