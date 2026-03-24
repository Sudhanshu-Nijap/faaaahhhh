const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = require("zod");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../backend/.env") });

// Import backend models and services
const ScanReport = require("../backend/models/ScanReport");
const { runFullScan } = require("../backend/routes/scanRoutes");
const crawler = require("../backend/services/crawler");

// Connect to MongoDB
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI);
};

// Initialize modern MCP Server
const server = new McpServer({
  name: "qa-inspector",
  version: "1.0.0",
});

/**
 * Tool Definitions using the modern high-level API
 */

// 1. Audit URL Tool
server.tool(
  "audit_url",
  "Perform a comprehensive autonomous QA audit of a website URL.",
  {
    url: z.string().describe("The website URL to audit"),
    userId: z.string().optional().default("mcp-user").describe("Optional user ID for report ownership")
  },
  async ({ url, userId }) => {
    await connectDB();
    const report = new ScanReport({ url, userId, status: "in-progress" });
    await report.save();
    
    // Trigger high-accuracy pipeline
    await runFullScan(report._id, url);
    const finalReport = await ScanReport.findById(report._id);
    
    return {
      content: [{ 
        type: "text", 
        text: `Audit Complete for ${url}.\nReport ID: ${report._id}\nFindings: ${finalReport.brokenLinks.length} broken links, ${finalReport.uiIssues.length} UI issues, ${finalReport.consoleErrors.length} console errors.` 
      }]
    };
  }
);

// 2. Check Links Tool
server.tool(
  "check_links",
  "Scans a URL for broken links and returns a diagnostic report.",
  {
    url: z.string().describe("The URL to check for broken links")
  },
  async ({ url }) => {
    await connectDB();
    const report = new ScanReport({ url, userId: "mcp-checker", status: "checking-links" });
    await report.save();
    
    await crawler.crawlWebsite(report._id, url);
    const results = await ScanReport.findById(report._id);
    
    return {
      content: [{ 
        type: "text", 
        text: `Link Check Results for ${url}:\n${JSON.stringify(results.brokenLinks, null, 2)}` 
      }]
    };
  }
);

// 3. Autonomous Simulation Tool
server.tool(
  "run_manual_simulation",
  "Triggers an autonomous AI agent to perform complex multi-step manual testing simulations.",
  {
    url: z.string().describe("The URL to run simulations on")
  },
  async ({ url }) => {
    await connectDB();
    const { scanPage } = require("../backend/services/qaScanner");
    const report = new ScanReport({ url, userId: "mcp-sim", status: "in-progress" });
    await report.save();
    
    await scanPage(report._id, url);
    const results = await ScanReport.findById(report._id);
    
    return {
      content: [{ 
        type: "text", 
        text: `Autonomous Simulation Complete for ${url}.\nCaptured ${results.screenshots.length} screenshots and ${results.consoleErrors.length} console logs.` 
      }]
    };
  }
);

// Start Server on Standard I/O
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("QA Inspector MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in MCP server:", error);
  process.exit(1);
});
