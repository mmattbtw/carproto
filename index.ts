import { Agent, CredentialSession } from "@atproto/api";
import { CronJob } from "cron";
import * as dotenv from "dotenv";
import { existsSync, readFileSync, writeFileSync } from "fs";
import * as smartcar from "smartcar";
import type { Record } from "./lexiconTypes/types/net/mmatt/personal/vitals/car";

// Load environment variables
dotenv.config();

// Smartcar API configuration
const SMARTCAR_CLIENT_ID = process.env.SMARTCAR_CLIENT_ID;
const SMARTCAR_CLIENT_SECRET = process.env.SMARTCAR_CLIENT_SECRET;
const SMARTCAR_REDIRECT_URI =
  process.env.SMARTCAR_REDIRECT_URI || "http://localhost:3000/callback";
const VEHICLE_ID = process.env.VEHICLE_ID;

// Initialize Smartcar Auth Client
const client = new smartcar.AuthClient({
  clientId: SMARTCAR_CLIENT_ID!,
  clientSecret: SMARTCAR_CLIENT_SECRET!,
  redirectUri: SMARTCAR_REDIRECT_URI,
});

const manager = new CredentialSession(new URL("https://evil.gay"));
const agent = new Agent(manager);
await manager.login({
  identifier: process.env.BSKY_DID!,
  password: process.env.BSKY_PASS!,
});

// Token file path
const TOKENS_FILE = "./smartcar_tokens.json";

// Initialize token storage
function initTokenStorage(): void {
  try {
    if (!existsSync(TOKENS_FILE)) {
      writeFileSync(TOKENS_FILE, JSON.stringify({}, null, 2));
      console.log("✅ Token storage initialized");
    }
  } catch (error) {
    console.error("❌ Token storage initialization failed:", error);
  }
}

// Token storage functions
function saveTokens(accessToken: string, refreshToken: string): void {
  try {
    const tokenData = {
      access_token: accessToken,
      refresh_token: refreshToken,
      updated_at: new Date().toISOString(),
    };
    writeFileSync(TOKENS_FILE, JSON.stringify(tokenData, null, 2));
    console.log("💾 Tokens saved to file");
  } catch (error) {
    console.error("❌ Failed to save tokens:", error);
  }
}

function loadTokens(): {
  accessToken: string;
  refreshToken: string;
} | null {
  try {
    if (!existsSync(TOKENS_FILE)) {
      return null;
    }
    const tokenData = JSON.parse(readFileSync(TOKENS_FILE, "utf8"));
    if (tokenData.access_token && tokenData.refresh_token) {
      console.log("📂 Tokens loaded from file");
      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
      };
    }
    return null;
  } catch (error) {
    console.error("❌ Failed to load tokens:", error);
    return null;
  }
}

function clearTokens(): void {
  try {
    if (existsSync(TOKENS_FILE)) {
      writeFileSync(TOKENS_FILE, JSON.stringify({}, null, 2));
    }
    console.log("🗑️ Tokens cleared from file");
  } catch (error) {
    console.error("❌ Failed to clear tokens:", error);
  }
}

// Initialize token storage on startup
initTokenStorage();

// Token variables
let accessToken: string | null = null;
let refreshToken: string | null = null;

// Ensure we have a valid access token
async function ensureValidToken(): Promise<string> {
  // Load tokens from database if not in memory
  if (!accessToken || !refreshToken) {
    const savedTokens = loadTokens();
    if (savedTokens) {
      accessToken = savedTokens.accessToken;
      refreshToken = savedTokens.refreshToken;
    }
  }

  if (!accessToken) {
    if (!refreshToken) {
      throw new Error("No valid tokens available. Please re-authenticate.");
    }

    console.log("🔄 Refreshing access token...");
    const tokens = await client.exchangeRefreshToken(refreshToken);
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken; // SDK provides new refresh token

    // Save new tokens to database
    saveTokens(accessToken!, refreshToken!);
    console.log("✅ Access token refreshed and saved");
  }

  return accessToken!;
}

// Main API function - now uses Smartcar SDK
async function makeApiRequest(): Promise<void> {
  try {
    console.log(`[${new Date().toISOString()}] Making Smartcar API request...`);

    // Check if we have required environment variables
    if (!SMARTCAR_CLIENT_ID || !SMARTCAR_CLIENT_SECRET) {
      throw new Error(
        "Missing Smartcar credentials. Please set SMARTCAR_CLIENT_ID and SMARTCAR_CLIENT_SECRET"
      );
    }

    if (!VEHICLE_ID) {
      throw new Error(
        "Missing VEHICLE_ID. Please set your vehicle ID in environment variables"
      );
    }

    // Ensure we have a valid access token
    const token = await ensureValidToken();

    // Create vehicle instance using the SDK
    const vehicle = new smartcar.Vehicle(VEHICLE_ID, token, {
      unitSystem: "imperial", // Use imperial units for better readability
    });

    // Get additional vehicle data
    let odometer: any = null;
    let fuelLevel: any = null;

    try {
      odometer = await vehicle.odometer();
      console.log(
        `📏 Odometer: ${odometer.distance} ${odometer.unit || "miles"}`
      );
    } catch (odometerError) {
      console.log("📏 Odometer: Not available");
      console.log(odometerError);
    }

    try {
      fuelLevel = await vehicle.fuel();
      console.log(`🔋 Fuel Range: ${fuelLevel.range} miles`);
      console.log(
        `🔋 Fuel Percentage: ${Math.floor(fuelLevel.percentRemaining * 100)}%`
      );
    } catch (fuelLevelError) {
      console.log("🔋 Fuel Level: Not available");
      console.log(fuelLevelError);
    }

    console.log("✅ Smartcar API request completed successfully");

    // Create car data record if we have both fuel and odometer data
    if (fuelLevel && odometer) {
      const data: Record = {
        $type: "net.mmatt.personal.vitals.car",
        createdAt: new Date().toISOString(),
        carFuelRange: fuelLevel.range || 0,
        carPercentFuelRemaining: (fuelLevel.percentRemaining || 0) * 100,
        amountRemaining: fuelLevel.amountRemaining || 0,
        carTraveledDistance: odometer.distance || 0,
      };

      await agent.com.atproto.repo.createRecord({
        collection: "net.mmatt.personal.vitals.car",
        record: data,
        repo: process.env.BSKY_DID!,
      });

      console.log("📊 Car data record created:", data);
    } else {
      console.log("⚠️ Missing fuel or odometer data, skipping record creation");
    }
  } catch (error) {
    console.error("❌ Smartcar API request failed:", error);

    // If it's an auth error, provide helpful guidance
    if (error instanceof Error && error.message.includes("401")) {
      console.log("\n🔐 Authentication Error - You may need to:");
      console.log("   1. Set up your environment variables (.env file)");
      console.log("   2. Run the OAuth flow to get initial tokens");
      console.log("   3. Check if your tokens have expired");
    }
  }
}

// Create cron jobs for 16 requests spread throughout the day (8am-8pm)
// Avoiding overnight hours and spreading requests evenly

const cronJobs: CronJob[] = [
  // Morning (8am-11am): 4 requests
  new CronJob("0 8 * * *", makeApiRequest, null, false, "America/Chicago"), // 8:00 AM
  new CronJob("30 9 * * *", makeApiRequest, null, false, "America/Chicago"), // 9:30 AM
  new CronJob("0 10 * * *", makeApiRequest, null, false, "America/Chicago"), // 10:00 AM
  new CronJob("45 11 * * *", makeApiRequest, null, false, "America/Chicago"), // 11:45 AM

  // Midday (12pm-3pm): 4 requests
  new CronJob("15 12 * * *", makeApiRequest, null, false, "America/Chicago"), // 12:15 PM
  new CronJob("0 13 * * *", makeApiRequest, null, false, "America/Chicago"), // 1:00 PM
  new CronJob("40 14 * * *", makeApiRequest, null, false, "America/Chicago"), // 2:40 PM
  new CronJob("0 15 * * *", makeApiRequest, null, false, "America/Chicago"), // 3:00 PM

  // Afternoon (4pm-7pm): 4 requests
  new CronJob("25 16 * * *", makeApiRequest, null, false, "America/Chicago"), // 4:25 PM
  new CronJob("10 17 * * *", makeApiRequest, null, false, "America/Chicago"), // 5:10 PM
  new CronJob("35 18 * * *", makeApiRequest, null, false, "America/Chicago"), // 6:35 PM
  new CronJob("5 19 * * *", makeApiRequest, null, false, "America/Chicago"), // 7:05 PM

  // Evening (8pm): 4 requests
  new CronJob("0 20 * * *", makeApiRequest, null, false, "America/Chicago"), // 8:00 PM
  new CronJob("20 20 * * *", makeApiRequest, null, false, "America/Chicago"), // 8:20 PM
  new CronJob("40 20 * * *", makeApiRequest, null, false, "America/Chicago"), // 8:40 PM
  new CronJob("0 21 * * *", makeApiRequest, null, false, "America/Chicago"), // 9:00 PM (just before 8pm cutoff)
];

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down cron jobs...");
  cronJobs.forEach((job, index) => {
    job.stop();
    console.log(`⏹️  Job ${index + 1} stopped`);
  });

  console.log("👋 Goodbye!");
  process.exit(0);
});
// OAuth setup function
async function setupOAuth(): Promise<void> {
  if (!SMARTCAR_CLIENT_ID || !SMARTCAR_CLIENT_SECRET) {
    console.log("❌ Missing Smartcar credentials!");
    console.log("Please set up your .env file with:");
    console.log("   SMARTCAR_CLIENT_ID=your_client_id");
    console.log("   SMARTCAR_CLIENT_SECRET=your_client_secret");
    console.log("   VEHICLE_ID=your_vehicle_id");
    console.log("\nGet these from: https://console.smartcar.com/");
    return;
  }

  if (!VEHICLE_ID) {
    console.log("❌ Missing VEHICLE_ID!");
    console.log("Please set VEHICLE_ID in your .env file");
    return;
  }

  console.log("🔐 Smartcar OAuth Setup");
  console.log("1. Visit this URL to authorize your app:");
  const authUrl = client.getAuthUrl([
    "read_vehicle_info",
    "read_odometer",
    "read_fuel",
    "read_climate",
  ]);
  console.log(`   ${authUrl}`);
  console.log(
    "\n2. After authorization, you'll get a code in the callback URL"
  );
  console.log("3. Use the code with the exchangeCode method");
  console.log("\n💡 Tip: You can also run this with a specific auth code:");
  console.log("   bun run index.ts --auth-code=YOUR_CODE_HERE");
}

// Check command line arguments
const args = process.argv.slice(2);
const authCodeArg = args.find((arg) => arg.startsWith("--auth-code="));
const clearTokensArg = args.find((arg) => arg === "--clear-tokens");

if (clearTokensArg) {
  console.log("🗑️ Clearing stored tokens...");
  try {
    clearTokens();
    console.log("✅ Tokens cleared successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to clear tokens:", error);
    process.exit(1);
  }
} else if (authCodeArg) {
  const authCode = authCodeArg.split("=")[1];
  if (!authCode) {
    console.error("❌ No auth code provided");
    process.exit(1);
  }
  console.log("🔄 Exchanging authorization code for tokens...");

  client
    .exchangeCode(authCode)
    .then(async (tokens) => {
      accessToken = tokens.accessToken;
      refreshToken = tokens.refreshToken;

      // Save tokens to database
      saveTokens(accessToken!, refreshToken!);

      console.log("✅ Tokens obtained successfully!");
      console.log(`   Access token: ${accessToken!.substring(0, 20)}...`);
      console.log(`   Refresh token: ${refreshToken!.substring(0, 20)}...`);
      console.log("\n🚀 Starting cron scheduler...");
      startCronScheduler();
    })
    .catch((error) => {
      console.error("❌ Token exchange failed:", error);
      process.exit(1);
    });
} else {
  // Try to load tokens from database on startup
  try {
    const savedTokens = loadTokens();
    if (savedTokens) {
      accessToken = savedTokens.accessToken;
      refreshToken = savedTokens.refreshToken;
      console.log("🔐 Tokens loaded from database. Starting cron scheduler...");
      startCronScheduler();
    } else {
      console.log("🔐 No tokens found. Setting up OAuth...");
      setupOAuth();
    }
  } catch (error) {
    console.error("❌ Failed to load tokens:", error);
    console.log("🔐 Setting up OAuth...");
    setupOAuth();
  }
}

function startCronScheduler(): void {
  console.log("🕐 Starting cron jobs for Smartcar API requests...");
  console.log("📊 Schedule: 16 requests per day (8am-8pm, avoiding overnight)");
  console.log("⏰ Timezone: America/Chicago");

  cronJobs.forEach((job, index) => {
    job.start();
    console.log(`✅ Job ${index + 1} started: ${job.cronTime.toString()}`);
  });

  // Keep the process running
  console.log("🚀 Cron scheduler is running. Press Ctrl+C to stop.");
  console.log("📝 Schedule summary:");
  console.log("   • 8am-11am: 4 requests (8:00, 9:30, 10:00, 11:45)");
  console.log("   • 12pm-3pm: 4 requests (12:15, 1:00, 2:40, 3:00)");
  console.log("   • 4pm-7pm: 4 requests (4:25, 5:10, 6:35, 7:05)");
  console.log("   • 8pm: 4 requests (8:00, 8:20, 8:40, 9:00)");
  console.log("   • Total: 16 requests/day (8am-8pm, 0 overnight)");
}

await makeApiRequest();
