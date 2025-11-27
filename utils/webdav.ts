import { createClient, WebDAVClient, AuthType } from 'webdav';
import { AppData } from '../types';

export const createWebDavClient = (url: string, user: string, pass: string, proxyUrl?: string): WebDAVClient => {
  // If we're using a worker proxy, we might need to ensure paths are handled correctly,
  // but generally the client library handles absolute URLs fine.
  // The proxy logic for dev mode is specific to direct jianguoyun connections.
  let connectionUrl = url;

  if (proxyUrl && proxyUrl.trim() !== '') {
    // If proxyUrl is provided (e.g. Cloudflare Worker), prepend it to the target URL
    // Format: https://worker-url/https://target-webdav-url/
    const normalizedProxy = proxyUrl.endsWith('/') ? proxyUrl : `${proxyUrl}/`;
    connectionUrl = `${normalizedProxy}${url}`;
  } else if (import.meta.env.DEV && url.includes('jianguoyun.com')) {
    connectionUrl = '/webdav';
  }

  // The 'webdav' library's createClient does not typically send the 'Authorization' header
  // by default on the initial PROPFIND request if authType isn't explicitly set to 'Digest' or 'Basic'.
  // Jianguoyun uses Basic Auth.
  return createClient(connectionUrl, {
    username: user,
    password: pass,
    authType: AuthType.Password // Use correct enum value for Basic/Password auth
  });
};

export const testWebDavConnection = async (client: WebDAVClient): Promise<boolean> => {
  try {
    // Try to list the root directory
    await client.getDirectoryContents("/");
    return true;
  } catch (e) {
    console.error("WebDAV connection test failed:", e);
    return false;
  }
};

export const performBackup = async (client: WebDAVClient, data: AppData, retentionCount: number): Promise<void> => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `habitpulse_backup_${timestamp}.json`;
  const content = JSON.stringify(data);

  // Upload current backup
  // Jianguoyun and some other WebDAV servers require PUT to the full path,
  // but webdav client might need relative path adjustment depending on configuration.
  // Using explicit path relative to root
  await client.putFileContents(`/${filename}`, content);

  // Cleanup old backups
  if (retentionCount > 0) {
    try {
      const contents = await client.getDirectoryContents("/");
      
      if (Array.isArray(contents)) {
        const backups = contents
          .filter((item: any) => 
            item.type === "file" && 
            item.basename.startsWith("habitpulse_backup_") && 
            item.basename.endsWith(".json")
          )
          .sort((a: any, b: any) => {
            // Sort by filename descending (newest first) since it contains ISO timestamp
            return b.basename.localeCompare(a.basename);
          });

        if (backups.length > retentionCount) {
          const toDelete = backups.slice(retentionCount);
          for (const item of toDelete) {
            try {
              await client.deleteFile(item.filename);
            } catch (e) {
              console.error("Failed to delete old backup:", item.filename, e);
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to rotate backups:", e);
      // Don't fail the whole sync if rotation fails
    }
  }
};

