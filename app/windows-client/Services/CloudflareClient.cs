using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using Newtonsoft.Json;
using PCRemoteControl.Models;
using PCRemoteControl.Utils;

namespace PCRemoteControl.Services
{
    public class CloudflareClient
    {
        private readonly string _apiToken;
        private readonly string _accountId;
        private readonly string _namespaceId;
        private readonly HttpClient _httpClient;
        private readonly Logger _logger;

        public CloudflareClient(string apiToken, string accountId, string namespaceId, Logger logger)
        {
            _apiToken = apiToken;
            _accountId = accountId;
            _namespaceId = namespaceId;
            _logger = logger;

            _httpClient = new HttpClient();
            _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiToken}");
        }

        // Polling commands for this device
        public async Task<List<Command>> GetCommandsAsync(string deviceId)
        {
            try
            {
                string key = $"commands:{deviceId}";
                string url = $"https://api.cloudflare.com/client/v4/accounts/{_accountId}/storage/kv/namespaces/{_namespaceId}/values/{key}";

                var response = await _httpClient.GetAsync(url);

                if (response.IsSuccessStatusCode)
                {
                    string content = await response.Content.ReadAsStringAsync();
                    var commandResponse = JsonConvert.DeserializeObject<CommandResponse>(content);
                    
                    _logger.LogInfo($"Fetched {commandResponse?.Commands?.Count ?? 0} commands from Cloudflare");
                    return commandResponse?.Commands ?? new List<Command>();
                }
                else if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    // No commands for this device
                    return new List<Command>();
                }
                else
                {
                    _logger.LogError($"Cloudflare API error: {response.StatusCode}");
                    return new List<Command>();
                }
            }
            catch (Exception ex)
            {
                _logger.LogException(ex);
                return new List<Command>();
            }
        }

        // Send command result back to Cloudflare
        public async Task<bool> SendResultAsync(CommandResult result)
        {
            try
            {
                string key = $"results:{result.DeviceId}:{result.CommandId}";
                string url = $"https://api.cloudflare.com/client/v4/accounts/{_accountId}/storage/kv/namespaces/{_namespaceId}/values/{key}";

                string jsonContent = JsonConvert.SerializeObject(result);
                var content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");

                var response = await _httpClient.PutAsync(url, content);

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogSuccess($"Result sent for command {result.CommandId}");
                    return true;
                }
                else
                {
                    _logger.LogError($"Failed to send result: {response.StatusCode}");
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logger.LogException(ex);
                return false;
            }
        }

        // Update device status
        public async Task<bool> UpdateStatusAsync(SystemStatus status)
        {
            try
            {
                string key = $"status:{status.DeviceId}";
                string url = $"https://api.cloudflare.com/client/v4/accounts/{_accountId}/storage/kv/namespaces/{_namespaceId}/values/{key}";

                string jsonContent = JsonConvert.SerializeObject(status);
                var content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");

                var response = await _httpClient.PutAsync(url, content);

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInfo("Device status updated");
                    return true;
                }
                else
                {
                    _logger.LogWarning($"Failed to update status: {response.StatusCode}");
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logger.LogException(ex);
                return false;
            }
        }

        // Delete command after processing
        public async Task<bool> DeleteCommandAsync(string deviceId, string commandId)
        {
            try
            {
                string key = $"commands:{deviceId}";
                string url = $"https://api.cloudflare.com/client/v4/accounts/{_accountId}/storage/kv/namespaces/{_namespaceId}/values/{key}";

                var response = await _httpClient.DeleteAsync(url);

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInfo($"Command {commandId} deleted from KV");
                    return true;
                }
                else
                {
                    _logger.LogWarning($"Failed to delete command: {response.StatusCode}");
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logger.LogException(ex);
                return false;
            }
        }
    }
}
