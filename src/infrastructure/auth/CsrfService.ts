function generateTokenBytes(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface CsrfConfig {
  cookieName: string;
  headerName: string;
  secret: string;
}

export class CsrfService {
  private readonly config: CsrfConfig;

  constructor(config?: Partial<CsrfConfig>) {
    this.config = {
      cookieName: "__Host-csrf",
      headerName: "x-csrf-token",
      secret: generateTokenBytes(32),
      ...config,
    };
  }

  generateToken(): string {
    return generateTokenBytes(32);
  }

  validate(token: string, cookieToken: string): boolean {
    if (!token || !cookieToken) return false;
    if (token.length !== 64 || cookieToken.length !== 64) return false;

    try {
      return this.constantTimeCompare(token, cookieToken);
    } catch {
      return false;
    }
  }

  getCookieName(): string {
    return this.config.cookieName;
  }

  getHeaderName(): string {
    return this.config.headerName;
  }

  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}
