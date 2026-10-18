import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { ethers } from 'ethers';

dotenv.config();

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function bufferToBase58(buffer: Buffer): string {
  const digits = [0];
  for (let i = 0; i < buffer.length; i++) {
    for (let j = 0; j < digits.length; j++) digits[j] <<= 8;
    digits[0] += buffer[i];
    let carry = 0;
    for (let j = 0; j < digits.length; j++) {
      digits[j] += carry;
      carry = (digits[j] / 58) | 0;
      digits[j] %= 58;
    }
    while (carry) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let str = '';
  for (let i = 0; i < buffer.length && buffer[i] === 0; i++) str += '1';
  for (let i = digits.length - 1; i >= 0; i--) str += BASE58_ALPHABET[digits[i]];
  return str;
}

export interface PinResult {
  cid: string;
  gatewayUrl: string;
  size: number;
  timestamp: string;
}

export class IPFSService {
  private static storageDir = path.resolve(__dirname, '../../../storage/ipfs');

  private static ensureStorageDir(): void {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  public static isPinataConfigured(): boolean {
    const jwt = process.env.PINATA_JWT;
    const key = process.env.PINATA_API_KEY;
    const secret = process.env.PINATA_SECRET_KEY;
    return Boolean(jwt || (key && secret));
  }

  public static getGatewayUrl(cid: string): string {
    const baseGateway = process.env.IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';
    return `${baseGateway.replace(/\/+$/, '')}/${cid}`;
  }

  /**
   * Generates a standard IPFS CIDv0 (Base58 encoded sha2-256 multihash)
   */
  public static calculateCID(data: Buffer): string {
    const hash = crypto.createHash('sha256').update(data).digest();
    const multihash = Buffer.concat([Buffer.from([0x12, 0x20]), hash]);
    return bufferToBase58(multihash);
  }

  /**
   * Pins JSON metadata (e.g. artwork properties, traits, physical specs) to IPFS
   */
  public static async pinJSON(metadata: Record<string, any>, name?: string): Promise<PinResult> {
    const jsonBuffer = Buffer.from(JSON.stringify(metadata, null, 2), 'utf8');
    const localCid = this.calculateCID(jsonBuffer);
    const pinName = name || `Aureum-Artwork-${Date.now()}`;

    // Always cache locally for instant local availability
    this.ensureStorageDir();
    const filePath = path.join(this.storageDir, localCid);
    fs.writeFileSync(filePath, jsonBuffer);
    fs.writeFileSync(`${filePath}.meta.json`, JSON.stringify({
      name: pinName,
      contentType: 'application/json',
      timestamp: new Date().toISOString(),
    }));

    if (this.isPinataConfigured()) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (process.env.PINATA_JWT) {
          headers['Authorization'] = `Bearer ${process.env.PINATA_JWT}`;
        } else {
          headers['pinata_api_key'] = process.env.PINATA_API_KEY!;
          headers['pinata_secret_api_key'] = process.env.PINATA_SECRET_KEY!;
        }

        const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            pinataContent: metadata,
            pinataMetadata: { name: pinName },
          }),
        });

        if (response.ok) {
          const resJson: any = await response.json();
          const remoteCid = resJson.IpfsHash;
          return {
            cid: remoteCid,
            gatewayUrl: this.getGatewayUrl(remoteCid),
            size: jsonBuffer.length,
            timestamp: new Date().toISOString(),
          };
        } else {
          console.warn('⚠️ Pinata pinJSONToIPFS HTTP error:', response.statusText);
        }
      } catch (err) {
        console.warn('⚠️ Failed to pin to Pinata cloud, using local IPFS anchor:', (err as Error).message);
      }
    }

    return {
      cid: localCid,
      gatewayUrl: this.getGatewayUrl(localCid),
      size: jsonBuffer.length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Pins an uploaded binary file (image or certificate PDF) to IPFS
   */
  public static async pinFile(
    fileBuffer: Buffer,
    originalFilename: string,
    mimeType: string = 'application/octet-stream'
  ): Promise<PinResult> {
    const localCid = this.calculateCID(fileBuffer);

    this.ensureStorageDir();
    const filePath = path.join(this.storageDir, localCid);
    fs.writeFileSync(filePath, fileBuffer);
    fs.writeFileSync(`${filePath}.meta.json`, JSON.stringify({
      filename: originalFilename,
      contentType: mimeType,
      timestamp: new Date().toISOString(),
    }));

    if (this.isPinataConfigured()) {
      try {
        const formData = new FormData();
        const blob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType });
        formData.append('file', blob, originalFilename);
        formData.append(
          'pinataMetadata',
          JSON.stringify({ name: `Aureum-${originalFilename}-${Date.now()}` })
        );

        const headers: Record<string, string> = {};
        if (process.env.PINATA_JWT) {
          headers['Authorization'] = `Bearer ${process.env.PINATA_JWT}`;
        } else {
          headers['pinata_api_key'] = process.env.PINATA_API_KEY!;
          headers['pinata_secret_api_key'] = process.env.PINATA_SECRET_KEY!;
        }

        const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
          method: 'POST',
          headers,
          body: formData,
        });

        if (response.ok) {
          const resJson: any = await response.json();
          const remoteCid = resJson.IpfsHash;
          return {
            cid: remoteCid,
            gatewayUrl: this.getGatewayUrl(remoteCid),
            size: fileBuffer.length,
            timestamp: new Date().toISOString(),
          };
        } else {
          console.warn('⚠️ Pinata pinFileToIPFS HTTP error:', response.statusText);
        }
      } catch (err) {
        console.warn('⚠️ Pinata file upload error, using local IPFS anchor:', (err as Error).message);
      }
    }

    return {
      cid: localCid,
      gatewayUrl: this.getGatewayUrl(localCid),
      size: fileBuffer.length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Retrieves content by CID from local cache or Pinata gateway
   */
  public static async retrieve(cid: string): Promise<{ data: Buffer; contentType: string } | null> {
    this.ensureStorageDir();
    const filePath = path.join(this.storageDir, cid);

    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath);
      let contentType = 'application/octet-stream';
      const metaPath = `${filePath}.meta.json`;
      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
          if (meta.contentType) contentType = meta.contentType;
        } catch {
          // ignore
        }
      }
      return { data, contentType };
    }

    // Attempt retrieval from gateway if not found locally
    try {
      const url = this.getGatewayUrl(cid);
      const res = await fetch(url);
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        const data = Buffer.from(arrayBuf);
        const contentType = res.headers.get('content-type') || 'application/octet-stream';
        // Cache locally for subsequent fast reads
        fs.writeFileSync(filePath, data);
        return { data, contentType };
      }
    } catch (err) {
      console.warn(`⚠️ Failed to retrieve CID ${cid} from gateway:`, (err as Error).message);
    }

    return null;
  }

  /**
   * Verifies if a given CID matches the anchored bytes32 on-chain hash
   */
  public static verifyCidMatch(cid: string, onChainBytes32: string): boolean {
    if (!cid || !onChainBytes32) return false;
    const computed = ethers.keccak256(ethers.toUtf8Bytes(cid));
    return computed.toLowerCase() === onChainBytes32.toLowerCase();
  }
}
