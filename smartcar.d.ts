declare module "smartcar" {
  // Auth Client Configuration
  interface AuthClientConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    mode?: "live" | "test";
    development?: boolean;
  }

  // Token Response
  interface TokenResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
    scope: string[];
    refreshExpiresIn?: number;
  }

  // Vehicle Options
  interface VehicleOptions {
    unitSystem?: "metric" | "imperial";
    version?: string;
    flags?: Record<string, string | boolean>;
  }

  // Vehicle Attributes Response
  interface VehicleAttributes {
    id: string;
    make: string;
    model: string;
    year: number;
    vin?: string;
    color?: string;
    fuel?: {
      type: string;
      capacity: number;
      remaining: number;
      unit: string;
    };
  }

  // VIN Response
  interface VIN {
    vin: string;
  }

  // Diagnostic System Status Response
  interface DiagnosticSystemStatus {
    status: string;
  }

  // Diagnostic Trouble Codes Response
  interface DiagnosticTroubleCodes {
    codes: Array<{
      code: string;
      description: string;
      severity: string;
    }>;
  }

  // Service History Response
  interface ServiceHistory {
    records: Array<{
      id: string;
      date: string;
      mileage: number;
      description: string;
      cost?: number;
    }>;
  }

  // Lock Status Response
  interface LockStatus {
    status: string;
  }

  // Odometer Response
  interface Odometer {
    distance: number;
    unit: string;
  }

  // Location Response
  interface Location {
    latitude: number;
    longitude: number;
    bearing?: number;
    speed?: number;
    accuracy?: number;
  }

  // Charge Response (for EVs)
  interface Charge {
    percentage: number;
    isPluggedIn: boolean;
    range?: number;
    timeRemaining?: number;
    chargingState?: string;
  }

  // Battery Response (for EVs)
  interface Battery {
    range: number;
    percentage: number;
  }

  // Engine Oil Response
  interface EngineOil {
    lifeRemaining: number;
    unit: string;
  }

  // Tire Pressure Response
  interface TirePressure {
    frontLeft: number;
    frontRight: number;
    backLeft: number;
    backRight: number;
    unit: string;
  }

  // Fuel Tank Response
  interface FuelTank {
    range: number;
    percentRemaining: number;
    amountRemaining: number;
    unit: string;
  }

  // Auth Client Class
  export class AuthClient {
    constructor(config: AuthClientConfig);

    getAuthUrl(
      scopes: string[],
      options?: {
        state?: string;
        makeBypass?: string;
        forcePrompt?: boolean;
        singleSelect?: {
          vin: string;
        };
      }
    ): string;

    exchangeCode(
      code: string,
      options?: {
        forcePrompt?: boolean;
      }
    ): Promise<TokenResponse>;

    exchangeRefreshToken(refreshToken: string): Promise<TokenResponse>;

    getVehicles(accessToken: string): Promise<{
      vehicles: Array<{
        id: string;
        make: string;
        model: string;
        year: number;
      }>;
      paging?: {
        count: number;
        offset: number;
      };
    }>;
  }

  // Vehicle Class
  export class Vehicle {
    constructor(id: string, accessToken: string, options?: VehicleOptions);

    // Vehicle Information
    attributes(): Promise<VehicleAttributes>;
    vin(): Promise<VIN>;
    permissions(): Promise<{
      permissions: string[];
    }>;

    // Vehicle Data
    odometer(): Promise<Odometer>;
    location(): Promise<Location>;

    // EV-specific methods
    charge(): Promise<Charge>;
    battery(): Promise<Battery>;
    batteryCapacity(): Promise<{ capacity: number; unit: string }>;
    nominalCapacity(): Promise<{ capacity: number; unit: string }>;

    // ICE-specific methods
    engineOil(): Promise<EngineOil>;
    fuel(): Promise<FuelTank>;

    // Other vehicle data
    tirePressure(): Promise<TirePressure>;

    // Vehicle Actions (if supported)
    lock(): Promise<{ status: string }>;
    unlock(): Promise<{ status: string }>;
    lockStatus(): Promise<LockStatus>;
    startCharge(): Promise<{ status: string }>;
    stopCharge(): Promise<{ status: string }>;

    // Navigation
    sendDestination(destination: {
      latitude: number;
      longitude: number;
    }): Promise<{ status: string }>;

    // Service and Diagnostics
    serviceHistory(): Promise<ServiceHistory>;
    diagnosticSystemStatus(): Promise<DiagnosticSystemStatus>;
    diagnosticTroubleCodes(): Promise<DiagnosticTroubleCodes>;

    // Utility methods
    disconnect(): Promise<{
      status: string;
    }>;
  }

  // Static utility functions
  export function getVehicles(accessToken: string): Promise<{
    vehicles: Array<{
      id: string;
      make: string;
      model: string;
      year: number;
    }>;
    paging?: {
      count: number;
      offset: number;
    };
  }>;

  export function getCompatibility(
    vin: string,
    scope: string[],
    options?: {
      country?: string;
    }
  ): Promise<{
    compatible: boolean;
    reason?: string;
    capabilities?: string[];
    permissions?: string[];
  }>;

  // Error classes
  export class SmartcarError extends Error {
    type: string;
    statusCode: number;
    requestId?: string;
    vehicleId?: string;
  }

  export class ValidationError extends SmartcarError {}
  export class AuthenticationError extends SmartcarError {}
  export class PermissionError extends SmartcarError {}
  export class RateLimitError extends SmartcarError {}
  export class MonthlyLimitError extends SmartcarError {}
  export class ServerError extends SmartcarError {}
  export class VehicleStateError extends SmartcarError {}
}
