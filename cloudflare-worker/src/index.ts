import { v4 as uuidv4 } from 'uuid';

interface Env {
  USERS_KV: KVNamespace;
  DEVICES_KV: KVNamespace;
  COMMANDS_KV: KVNamespace;
  RESULTS_KV: KVNamespace;
  PAIRING_KV: KVNamespace;
}

interface RegisterRequest {
  deviceId: string;
  macAddress: string;
  osVersion: string;
}

interface UserDeviceLink {
  userId: number;
  deviceId: string;
  linkedAt: string;
}

interface Device {
  deviceId: string;
  deviceToken: string;
  registeredAt: string;
  macAddress: string;
  osVersion: string;
  lastSeen?: string;
  status?: 'online' | 'offline';
}

interface CommandRequest {
  command: string;
  argument?: string | null;
}

interface Command {
  commandId: string;
  deviceId: string;
  command: string;
  argument?: string | null;
  status: string;
  createdAt: string;
  executedAt?: string;
  result?: any;
}

interface CommandResult {
  commandId: string;
  deviceId: string;
  success: boolean;
  result?: any;
  error?: string;
  executedAt: string;
}

interface PairingRequest {
  deviceId: string;
  telegramUserId: number;
  telegramUsername: string;
  timestamp: string;
}

interface PairingResult {
  confirmed?: boolean;
  denied?: boolean;
  expired?: boolean;
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Device-Token, X-User-Id, Authorization'
    };

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // ==================== TELEGRAM WEBHOOK ====================
      // POST /telegram/webhook
      if (url.pathname === '/telegram/webhook' && method === 'POST') {
        const telegramHandler = await import('./telegram-webhook');
        return telegramHandler.default.fetch(request, env);
      }

      // ==================== DEVICE REGISTRATION ====================
      // POST /api/register
      if (url.pathname === '/api/register' && method === 'POST') {
        return await handleRegister(request, env, corsHeaders);
      }

      // POST /api/device/{deviceId}/heartbeat
      if (url.pathname.match(/^\/api\/device\/[\w-]+\/heartbeat$/) && method === 'POST') {
        return await handleDeviceHeartbeat(url, request, env, corsHeaders);
      }

      // ==================== USER DEVICE MANAGEMENT ====================
      // GET /api/user/{userId}/device
      if (url.pathname.match(/^\/api\/user\/\d+\/device$/) && method === 'GET') {
        return await handleGetUserDevice(url, env, corsHeaders);
      }

      // POST /api/user/{userId}/link/{deviceId}
      if (url.pathname.match(/^\/api\/user\/\d+\/link\/[\w-]+$/) && method === 'POST') {
        return await handleLinkUserDevice(url, request, env, corsHeaders);
      }

      // DELETE /api/user/{userId}/unlink
      if (url.pathname.match(/^\/api\/user\/\d+\/unlink$/) && method === 'DELETE') {
        return await handleUnlinkUserDevice(url, env, corsHeaders);
      }

      // ==================== PAIRING ====================
      // POST /api/pairing/request
      if (url.pathname === '/api/pairing/request' && method === 'POST') {
        return await handlePairingRequest(request, env, corsHeaders);
      }

      // GET /api/pairing/result
      if (url.pathname === '/api/pairing/result' && method === 'GET') {
        return await handlePairingResult(url, env, corsHeaders);
      }

      // POST /api/pairing/confirm
      if (url.pathname === '/api/pairing/confirm' && method === 'POST') {
        return await handlePairingConfirm(request, env, corsHeaders);
      }

      // POST /api/pairing/deny
      if (url.pathname === '/api/pairing/deny' && method === 'POST') {
        return await handlePairingDeny(request, env, corsHeaders);
      }

      // ==================== COMMANDS ====================
      // POST /api/commands/{deviceId}
      if (url.pathname.match(/^\/api\/commands\/[\w-]+$/) && method === 'POST') {
        return await handleCreateCommand(url, request, env, corsHeaders);
      }

      // GET /api/commands/{deviceId}/pending
      if (url.pathname.match(/^\/api\/commands\/[\w-]+\/pending$/) && method === 'GET') {
        return await handleGetPendingCommands(url, env, corsHeaders);
      }

      // GET /api/commands/{deviceId}/{commandId}
      if (url.pathname.match(/^\/api\/commands\/[\w-]+\/[\w-]+$/) && method === 'GET') {
        return await handleGetCommand(url, env, corsHeaders);
      }

      // PUT /api/commands/{deviceId}/{commandId}/complete
      if (url.pathname.match(/^\/api\/commands\/[\w-]+\/[\w-]+\/complete$/) && method === 'PUT') {
        return await handleCompleteCommand(url, request, env, corsHeaders);
      }

      // ==================== RESULTS ====================
      // POST /api/results/{deviceId}
      if (url.pathname.match(/^\/api\/results\/[\w-]+$/) && method === 'POST') {
        return await handleCreateResult(url, request, env, corsHeaders);
      }

      // GET /api/results/{deviceId}/{commandId}
      if (url.pathname.match(/^\/api\/results\/[\w-]+\/[\w-]+$/) && method === 'GET') {
        return await handleGetResult(url, env, corsHeaders);
      }

      // ==================== DEVICE COMMANDS (NEW UNIFIED API) ====================
      // POST /api/device/{deviceId}/command
      if (url.pathname.match(/^\/api\/device\/[\w-]+\/command$/) && method === 'POST') {
        return await handleDeviceCommand(url, request, env, corsHeaders);
      }

      // GET /api/device/{deviceId}/status
      if (url.pathname.match(/^\/api\/device\/[\w-]+\/status$/) && method === 'GET') {
        return await handleGetDeviceStatus(url, env, corsHeaders);
      }

      // ==================== USER SETTINGS ====================
      // POST /api/user/{userId}/settings
      if (url.pathname.match(/^\/api\/user\/\d+\/settings$/) && method === 'POST') {
        return await handleUserSettings(url, request, env, corsHeaders);
      }

      // ==================== USERS MANAGEMENT (for broadcast) ====================
      // GET /api/users/list - get all users
      if (url.pathname === '/api/users/list' && method === 'GET') {
        return await handleGetUsersList(env, corsHeaders);
      }

      // GET /api/users/stats - get users statistics
      if (url.pathname === '/api/users/stats' && method === 'GET') {
        return await handleGetUsersStats(env, corsHeaders);
      }

      // 404
      return new Response(JSON.stringify({ ok: false, error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return new Response(JSON.stringify({ ok: false, error: errorMessage }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }
};

// ==================== HELPER FUNCTIONS ====================

async function handleRegister(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const body = await request.json() as RegisterRequest;
    const { deviceId, macAddress, osVersion } = body;

    if (!deviceId || !macAddress || !osVersion) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const deviceToken = uuidv4();

    const device: Device = {
      deviceId,
      deviceToken,
      registeredAt: new Date().toISOString(),
      macAddress,
      osVersion,
      status: 'online',
      lastSeen: new Date().toISOString()
    };

    await env.DEVICES_KV.put(`device:${deviceId}`, JSON.stringify(device));

    return new Response(JSON.stringify({ ok: true, deviceToken }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: errorMessage }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleDeviceHeartbeat(
  url: URL,
  _request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const pathParts = url.pathname.split('/');
    const deviceId = pathParts[3];

    const device = await env.DEVICES_KV.get(`device:${deviceId}`);
    if (!device) {
      return new Response(JSON.stringify({ ok: false, error: 'Device not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const deviceData = JSON.parse(device) as Device;
    deviceData.lastSeen = new Date().toISOString();
    deviceData.status = 'online';

    await env.DEVICES_KV.put(`device:${deviceId}`, JSON.stringify(deviceData));

    return new Response(JSON.stringify({ ok: true, status: 'online' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleGetUserDevice(url: URL, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const pathParts = url.pathname.split('/');
    const userId = parseInt(pathParts[3]);

    if (!userId) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid user ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const userLink = await env.USERS_KV.get(`user:${userId}`);

    if (!userLink) {
      return new Response(JSON.stringify({ ok: true, deviceId: null, linked: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const link = JSON.parse(userLink) as UserDeviceLink;
    return new Response(JSON.stringify({ ok: true, deviceId: link.deviceId, linked: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleLinkUserDevice(
  url: URL,
  _request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const pathParts = url.pathname.split('/');
    const userId = parseInt(pathParts[3]);
    const deviceId = pathParts[5];

    if (!userId || !deviceId) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid user ID or device ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const device = await env.DEVICES_KV.get(`device:${deviceId}`);
    if (!device) {
      return new Response(JSON.stringify({ ok: false, error: 'Device not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const userLink: UserDeviceLink = {
      userId,
      deviceId,
      linkedAt: new Date().toISOString()
    };

    await env.USERS_KV.put(`user:${userId}`, JSON.stringify(userLink));

    return new Response(JSON.stringify({ ok: true, message: 'Device linked successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleUnlinkUserDevice(
  url: URL,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const pathParts = url.pathname.split('/');
    const userId = parseInt(pathParts[3]);

    if (!userId) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid user ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    await env.USERS_KV.delete(`user:${userId}`);

    return new Response(JSON.stringify({ ok: true, message: 'Device unlinked successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handlePairingRequest(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json() as PairingRequest;
    const { deviceId, telegramUserId, telegramUsername, timestamp } = body;

    if (!deviceId || !telegramUserId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing required fields' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const device = await env.DEVICES_KV.get(`device:${deviceId}`);
    if (!device) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Device not found' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const pairingRequest: PairingRequest = {
      deviceId,
      telegramUserId,
      telegramUsername,
      timestamp
    };

    await env.PAIRING_KV.put(
      `pairing:${deviceId}:${telegramUserId}`, 
      JSON.stringify(pairingRequest),
      { expirationTtl: 120 }
    );

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Pairing request created',
      pairingId: `${deviceId}:${telegramUserId}`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handlePairingResult(
  url: URL,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const deviceId = url.searchParams.get('deviceId');
    const userId = url.searchParams.get('userId');

    if (!deviceId || !userId) {
      return new Response(JSON.stringify({ error: 'Missing deviceId or userId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const pairingData = await env.PAIRING_KV.get(`pairing:${deviceId}:${userId}`);
    
    if (!pairingData) {
      return new Response(JSON.stringify({ expired: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const resultData = await env.PAIRING_KV.get(`pairing_result:${deviceId}:${userId}`);
    
    if (!resultData) {
      return new Response(JSON.stringify({ pending: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const result = JSON.parse(resultData) as PairingResult;
    
    // Clean up
    await env.PAIRING_KV.delete(`pairing:${deviceId}:${userId}`);
    await env.PAIRING_KV.delete(`pairing_result:${deviceId}:${userId}`);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handlePairingConfirm(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json() as { deviceId?: string; telegramUserId?: number };
    const { deviceId, telegramUserId } = body;

    if (!deviceId || !telegramUserId) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    await env.PAIRING_KV.put(
      `pairing_result:${deviceId}:${telegramUserId}`,
      JSON.stringify({ confirmed: true })
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handlePairingDeny(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json() as { deviceId?: string; telegramUserId?: number };
    const { deviceId, telegramUserId } = body;

    if (!deviceId || !telegramUserId) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    await env.PAIRING_KV.put(
      `pairing_result:${deviceId}:${telegramUserId}`,
      JSON.stringify({ denied: true })
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleCreateCommand(
  url: URL,
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const pathParts = url.pathname.split('/');
    const deviceId = pathParts[3];

    if (!deviceId) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid device ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const device = await env.DEVICES_KV.get(`device:${deviceId}`);
    if (!device) {
      return new Response(JSON.stringify({ ok: false, error: 'Device not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const body = await request.json() as CommandRequest;
    const { command, argument } = body;

    if (!command) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing command field' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const commandId = uuidv4();

    const cmd: Command = {
      commandId,
      deviceId,
      command,
      argument: argument || null,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    await env.COMMANDS_KV.put(`command:${deviceId}:${commandId}`, JSON.stringify(cmd));

    return new Response(JSON.stringify({ ok: true, commandId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: errorMessage }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleGetPendingCommands(
  url: URL,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const pathParts = url.pathname.split('/');
    const deviceId = pathParts[3];

    if (!deviceId) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid device ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const keys = await env.COMMANDS_KV.list({ prefix: `command:${deviceId}:` });
    const pendingCommands: Command[] = [];

    for (const key of keys.keys) {
      const cmdData = await env.COMMANDS_KV.get(key.name);
      if (cmdData) {
        const cmd = JSON.parse(cmdData) as Command;
        if (cmd.status === 'pending') {
          pendingCommands.push(cmd);
        }
      }
    }

    return new Response(JSON.stringify({ 
      ok: true, 
      commands: pendingCommands,
      count: pendingCommands.length 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleGetCommand(
  url: URL,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const pathParts = url.pathname.split('/');
    const deviceId = pathParts[3];
    const commandId = pathParts[4];

    const cmdData = await env.COMMANDS_KV.get(`command:${deviceId}:${commandId}`);
    
    if (!cmdData) {
      return new Response(JSON.stringify({ ok: false, error: 'Command not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const cmd = JSON.parse(cmdData) as Command;
    return new Response(JSON.stringify({ ok: true, command: cmd }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleCompleteCommand(
  url: URL,
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const pathParts = url.pathname.split('/');
    const deviceId = pathParts[3];
    const commandId = pathParts[4];

    const body = await request.json() as { result?: any; error?: string };
    const { result, error } = body;

    const cmdData = await env.COMMANDS_KV.get(`command:${deviceId}:${commandId}`);
    if (!cmdData) {
      return new Response(JSON.stringify({ ok: false, error: 'Command not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const cmd = JSON.parse(cmdData) as Command;
    cmd.status = error ? 'failed' : 'completed';
    cmd.executedAt = new Date().toISOString();
    cmd.result = result;

    await env.COMMANDS_KV.put(`command:${deviceId}:${commandId}`, JSON.stringify(cmd));

    // Store result separately
    const commandResult: CommandResult = {
      commandId,
      deviceId,
      success: !error,
      result,
      error,
      executedAt: cmd.executedAt
    };

    await env.RESULTS_KV.put(
      `result:${deviceId}:${commandId}`,
      JSON.stringify(commandResult),
      { expirationTtl: 3600 }
    );

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleCreateResult(
  url: URL,
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const pathParts = url.pathname.split('/');
    const deviceId = pathParts[3];

    const body = await request.json() as { commandId?: string; success?: boolean; result?: any; error?: string };
    const { commandId, success, result, error } = body;

    if (!commandId) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing commandId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const commandResult: CommandResult = {
      commandId,
      deviceId,
      success: success || false,
      result,
      error,
      executedAt: new Date().toISOString()
    };

    await env.RESULTS_KV.put(
      `result:${deviceId}:${commandId}`,
      JSON.stringify(commandResult),
      { expirationTtl: 3600 }
    );

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleGetResult(
  url: URL,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const pathParts = url.pathname.split('/');
    const deviceId = pathParts[3];
    const commandId = pathParts[4];

    const resultData = await env.RESULTS_KV.get(`result:${deviceId}:${commandId}`);
    
    if (!resultData) {
      return new Response(null, { 
        status: 204,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const result = JSON.parse(resultData);
    return new Response(JSON.stringify({ ok: true, result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleDeviceCommand(
  url: URL,
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const pathParts = url.pathname.split('/');
    const deviceId = pathParts[3];

    const device = await env.DEVICES_KV.get(`device:${deviceId}`);
    if (!device) {
      return new Response(JSON.stringify({ ok: false, error: 'Device not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const body = await request.json() as { command?: string; argument?: any; telegramUserId?: number };
    const { command, argument, telegramUserId } = body;

    if (!command) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing command' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Verify user authorization if telegramUserId provided
    if (telegramUserId) {
      const userLink = await env.USERS_KV.get(`user:${telegramUserId}`);
      if (!userLink) {
        return new Response(JSON.stringify({ ok: false, error: 'User not authorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      const link = JSON.parse(userLink) as UserDeviceLink;
      if (link.deviceId !== deviceId) {
        return new Response(JSON.stringify({ ok: false, error: 'User not authorized for this device' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    const commandId = uuidv4();
    const cmd: Command = {
      commandId,
      deviceId,
      command,
      argument: argument || null,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    await env.COMMANDS_KV.put(`command:${deviceId}:${commandId}`, JSON.stringify(cmd));

    return new Response(JSON.stringify({ 
      ok: true, 
      commandId,
      message: 'Command sent successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleGetDeviceStatus(
  url: URL,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const pathParts = url.pathname.split('/');
    const deviceId = pathParts[3];

    const device = await env.DEVICES_KV.get(`device:${deviceId}`);
    if (!device) {
      return new Response(JSON.stringify({ ok: false, error: 'Device not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const deviceData = JSON.parse(device) as Device;
    
    // Check if device is offline (no heartbeat in last 5 minutes)
    const lastSeen = new Date(deviceData.lastSeen || 0);
    const now = new Date();
    const isOnline = (now.getTime() - lastSeen.getTime()) < 5 * 60 * 1000;
    
    if (!isOnline) {
      deviceData.status = 'offline';
      await env.DEVICES_KV.put(`device:${deviceId}`, JSON.stringify(deviceData));
    }

    return new Response(JSON.stringify({ 
      ok: true, 
      device: {
        deviceId: deviceData.deviceId,
        status: deviceData.status,
        lastSeen: deviceData.lastSeen,
        osVersion: deviceData.osVersion
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleUserSettings(
  url: URL,
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const pathParts = url.pathname.split('/');
    const userId = parseInt(pathParts[3]);

    const body = await request.json() as { notifications_enabled?: boolean };
    const { notifications_enabled } = body;

    if (userId && typeof notifications_enabled === 'boolean') {
      await env.USERS_KV.put(
        `user_settings:${userId}`,
        JSON.stringify({ notifications_enabled })
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

// ==================== USERS MANAGEMENT ====================

/**
 * Get list of all users with their devices
 */
async function handleGetUsersList(
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    // Get all user links from USERS_KV
    const usersList = await env.USERS_KV.list({ prefix: 'user:' });
    const users = [];

    for (const key of usersList.keys) {
      try {
        const userData = await env.USERS_KV.get(key.name);
        if (userData) {
          const user = JSON.parse(userData);
          users.push({
            telegramUserId: user.userId,
            deviceId: user.deviceId,
            linkedAt: user.linkedAt
          });
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }

    return new Response(JSON.stringify({ 
      ok: true, 
      users,
      count: users.length 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

/**
 * Get users statistics
 */
async function handleGetUsersStats(
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    // Get all user links
    const usersList = await env.USERS_KV.list({ prefix: 'user:' });
    const totalUsers = usersList.keys.length;

    // Get all devices and count online/offline
    const devicesList = await env.DEVICES_KV.list({ prefix: 'device:' });
    let onlineDevices = 0;
    let offlineDevices = 0;

    for (const key of devicesList.keys) {
      try {
        const deviceData = await env.DEVICES_KV.get(key.name);
        if (deviceData) {
          const device = JSON.parse(deviceData);
          const lastSeen = new Date(device.lastSeen || 0);
          const now = new Date();
          const isOnline = (now.getTime() - lastSeen.getTime()) < 5 * 60 * 1000; // 5 minutes

          if (isOnline) {
            onlineDevices++;
          } else {
            offlineDevices++;
          }
        }
      } catch (e) {
        console.error('Error parsing device data:', e);
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      totalUsers,
      totalDevices: onlineDevices + offlineDevices,
      onlineDevices,
      offlineDevices
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}
