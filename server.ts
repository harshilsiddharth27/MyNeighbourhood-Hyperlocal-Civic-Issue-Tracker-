import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { CivicIssue, ReportSubmitRequest } from "./src/types";
import fs from "fs";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Increase JSON payload size limits to allow base64 image uploads safely
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// Initialize the Gemini client on the server
let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  aiClient = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
  console.log("Gemini client initialized successfully.");
} else {
  console.warn("WARNING: GEMINI_API_KEY is not defined. Falling back to local rule-based analysis.");
}

// Ensure persistent storage directory exists
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const USERS_FILE = path.join(DATA_DIR, "users.json");
const ORGS_FILE = path.join(DATA_DIR, "orgs.json");
const REPORTS_FILE = path.join(DATA_DIR, "reports.json");
const RESOLVED_REPORTS_FILE = path.join(DATA_DIR, "resolved_reports.json");

// Authentication Databases Structures
interface UserAccount {
  email: string;
  name: string;
  passwordHash: string;
  clientId: string;
}

interface LocalBody {
  orgId: string;
  name: string;
  passwordHash: string;
}

// Default Seed Data
const initialReports: CivicIssue[] = [
  {
    id: "rep_1",
    title: "Crater-sized Pothole near Connaught Place",
    description: "Huge pothole in the middle of the northbound lane. Multiple vehicles have had to swerve dangerously to avoid it near Rajiv Chowk exit.",
    latitude: 28.6304,
    longitude: 77.2177,
    imageUrl: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600",
    imageUrls: ["https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600"],
    preciseLocation: "Outer Circle, Block E, near Rajiv Chowk Metro Station Exit 4",
    landmarks: "Opposite to Wenger's Bakery",
    category: "Road Hazard",
    severity: "High",
    summary: "A large pothole obstructing traffic on a major Connaught Place thoroughfare.",
    recommendedAction: "Immediate asphalt filling and temporary road safety cones placement.",
    upvotes: 42,
    status: "Reported",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    assignedMunicipalCorporation: "Municipal Corporation of Delhi (MCD)",
    poc: {
      name: "Officer Marcus Brody",
      department: "MCD Civil Works - Road Safety Team",
      phone: "+91 98765 43210",
      email: "m.brody@mcd.gov.in",
      notes: "Assigned contractor team. Emergency temporary cold-patching is scheduled by Delhi works team."
    }
  },
  {
    id: "rep_2",
    title: "Illegal Trash & Garbage Pile on Linking Road",
    description: "Someone left massive bags of commercial trash and rotten organic waste right next to the shopping lane gate.",
    latitude: 19.0596,
    longitude: 72.8295,
    imageUrl: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600",
    imageUrls: ["https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600"],
    preciseLocation: "Linking Road, Santacruz West, next to shopping street alley",
    landmarks: "Next to the Woodland showroom",
    category: "Trash & Dumping",
    severity: "Medium",
    summary: "Bulk rubbish pile obstructing pedestrian sidewalk access and causing foul smell.",
    recommendedAction: "Dispatch sanitation truck crew for medical/toxic and general waste clearance.",
    upvotes: 18,
    status: "In Progress",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    assignedMunicipalCorporation: "Brihanmumbai Municipal Corporation (BMC)",
    poc: {
      name: "Inspector Dave Miller",
      department: "BMC Sanitation & Waste Division",
      phone: "+91 91234 56789",
      email: "d.miller@bmc.gov.in",
      notes: "Garbage collection crew dispatched. Reviewing nearby commercial shop camera feeds to identify fly-tipping offenders."
    }
  }
];

const initialResolvedReports: CivicIssue[] = [
  {
    id: "rep_3",
    title: "Broken Streetlight on Outer Ring Road",
    description: "The high-voltage street light pole has been completely dark for over a week, making the block extremely dark and unsafe at night.",
    latitude: 12.9249,
    longitude: 77.6710,
    imageUrl: "https://images.unsplash.com/photo-1542856391-010fb87dcfed?auto=format&fit=crop&q=80&w=600",
    imageUrls: ["https://images.unsplash.com/photo-1542856391-010fb87dcfed?auto=format&fit=crop&q=80&w=600"],
    preciseLocation: "Sarjapur-Marathahalli Outer Ring Road, near Bellandur flyover",
    landmarks: "In front of EcoSpace Tech Park gate 2",
    category: "Streetlight & Utilities",
    severity: "Medium",
    summary: "Streetlight grid failure on a busy highway route.",
    recommendedAction: "Replace the high-pressure sodium bulb with an energy-efficient LED.",
    upvotes: 29,
    status: "Resolved",
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    assignedMunicipalCorporation: "Bruhat Bengaluru Mahanagara Palike (BBMP)",
    poc: {
      name: "Sarah Jenkins",
      department: "BBMP Power & Grid Infrastructure",
      phone: "+91 99887 76655",
      email: "s.jenkins@bbmp.gov.in",
      notes: "Completed. Replaced old sodium vapor lamp with new 150W LED luminaire and tested circuit line."
    }
  }
];

const initialUsers: UserAccount[] = [
  {
    email: "harshpsiddhu@gmail.com",
    name: "Harsh P. Siddhu",
    passwordHash: "password123",
    clientId: "c_harsh123"
  }
];

const initialOrgs: LocalBody[] = [
  {
    orgId: "mcd",
    name: "Municipal Corporation of Delhi (MCD)",
    passwordHash: "delhi123"
  },
  {
    orgId: "bmc",
    name: "Brihanmumbai Municipal Corporation (BMC)",
    passwordHash: "mumbai123"
  },
  {
    orgId: "bbmp",
    name: "Bruhat Bengaluru Mahanagara Palike (BBMP)",
    passwordHash: "bengaluru123"
  }
];

// File load/save helper functions
function loadUsers(): UserAccount[] {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Error loading users database:", err);
  }
  saveUsers(initialUsers);
  return initialUsers;
}

function saveUsers(users: UserAccount[]) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving users database:", err);
  }
}

function loadOrgs(): LocalBody[] {
  try {
    if (fs.existsSync(ORGS_FILE)) {
      return JSON.parse(fs.readFileSync(ORGS_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Error loading organizations database:", err);
  }
  saveOrgs(initialOrgs);
  return initialOrgs;
}

function saveOrgs(orgs: LocalBody[]) {
  try {
    fs.writeFileSync(ORGS_FILE, JSON.stringify(orgs, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving organizations database:", err);
  }
}

function loadReports(): CivicIssue[] {
  try {
    if (fs.existsSync(REPORTS_FILE)) {
      return JSON.parse(fs.readFileSync(REPORTS_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Error loading reports database:", err);
  }
  saveReports(initialReports);
  return initialReports;
}

function saveReports(repList: CivicIssue[]) {
  try {
    fs.writeFileSync(REPORTS_FILE, JSON.stringify(repList, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving reports database:", err);
  }
}

function loadResolvedReports(): CivicIssue[] {
  try {
    if (fs.existsSync(RESOLVED_REPORTS_FILE)) {
      return JSON.parse(fs.readFileSync(RESOLVED_REPORTS_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Error loading resolved reports database:", err);
  }
  saveResolvedReports(initialResolvedReports);
  return initialResolvedReports;
}

function saveResolvedReports(resolvedList: CivicIssue[]) {
  try {
    fs.writeFileSync(RESOLVED_REPORTS_FILE, JSON.stringify(resolvedList, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving resolved reports database:", err);
  }
}

// Load databases on boot
let userAccounts = loadUsers();
let localBodies = loadOrgs();
let reports = loadReports();
let resolvedReports = loadResolvedReports();

// Helper: Haversine formula to compute distance in meters
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// REST APIs

// Auth Endpoints
// A. Check if email exists
app.post("/api/auth/check-email", (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ status: "error", message: "Email is required." });
  }
  const normalized = email.trim().toLowerCase();
  const exists = userAccounts.some(u => u.email === normalized);
  res.json({ status: "success", exists });
});

// B. Citizen login
app.post("/api/auth/citizen/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ status: "error", message: "Email and password are required." });
  }
  const normalized = email.trim().toLowerCase();
  const user = userAccounts.find(u => u.email === normalized && u.passwordHash === password);
  if (!user) {
    return res.status(401).json({ 
      status: "error", 
      message: "Invalid email or password.",
      canRegisterOrReset: true 
    });
  }
  res.json({ status: "success", user: { email: user.email, name: user.name, clientId: user.clientId } });
});

// C. Citizen register / overwrite account
app.post("/api/auth/citizen/register", (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ status: "error", message: "All fields are required." });
  }
  const normalized = email.trim().toLowerCase();
  const existingIndex = userAccounts.findIndex(u => u.email === normalized);
  
  let user: UserAccount;
  if (existingIndex !== -1) {
    // If account exists but they requested registration/reset, overwrite the credentials
    userAccounts[existingIndex].passwordHash = password;
    userAccounts[existingIndex].name = name.trim();
    user = userAccounts[existingIndex];
    console.log(`Updated user account permanently: ${normalized}`);
  } else {
    // Register brand new user account
    const newClientId = "c_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
    user = {
      email: normalized,
      name: name.trim(),
      passwordHash: password,
      clientId: newClientId
    };
    userAccounts.push(user);
    console.log(`Created new user account permanently: ${normalized}`);
  }
  
  saveUsers(userAccounts);
  res.status(201).json({ status: "success", user: { email: user.email, name: user.name, clientId: user.clientId } });
});

// D. Organization login (create & use if doesn't match/exist, with overwrite option)
app.post("/api/auth/org/login", (req, res) => {
  const { orgId, name, password, overwrite } = req.body;
  if (!orgId || !password) {
    return res.status(400).json({ status: "error", message: "Organization ID and passcode are required." });
  }
  const normalizedId = orgId.trim().toLowerCase();
  const existingIndex = localBodies.findIndex(o => o.orgId === normalizedId);

  if (existingIndex !== -1) {
    const org = localBodies[existingIndex];
    if (org.passwordHash !== password) {
      if (overwrite) {
        // Overwrite password permanently
        localBodies[existingIndex].passwordHash = password;
        if (name) localBodies[existingIndex].name = name.trim();
        saveOrgs(localBodies);
        console.log(`Overwrote local body organization password permanently: ${normalizedId}`);
        return res.json({ status: "success", org: { orgId: org.orgId, name: localBodies[existingIndex].name }, isOverwritten: true });
      }
      return res.status(401).json({ 
        status: "error", 
        message: "Invalid passcode for this organization.",
        canOverwrite: true 
      });
    }
    return res.json({ status: "success", org: { orgId: org.orgId, name: org.name } });
  } else {
    // Not matched details in database - let's create and use permanently!
    const fallbackName = name ? name.trim() : `${orgId.trim().toUpperCase()} Department`;
    const newOrg: LocalBody = {
      orgId: normalizedId,
      name: fallbackName,
      passwordHash: password
    };
    localBodies.push(newOrg);
    saveOrgs(localBodies);
    console.log(`Created new Local Body organization permanently: ${normalizedId}`);
    return res.json({ status: "success", org: { orgId: newOrg.orgId, name: newOrg.name }, isNew: true });
  }
});

// 1. Get all issues (combines active and resolved databases seamlessly)
app.get("/api/reports", (req, res) => {
  const allReports = [...reports, ...resolvedReports];
  const uniqueReports = Array.from(new Map(allReports.map(r => [r.id, r])).values());
  res.json({ status: "success", data: uniqueReports });
});

// 2. Submit a new issue (with Gemini AI multimodal analysis + India check + corporation auto-routing)
app.post("/api/reports", async (req, res) => {
  try {
    const { 
      title, 
      description, 
      latitude, 
      longitude, 
      image, // fallback single image
      images, // array of multiple images
      preciseLocation,
      landmarks,
      municipalCorporation,
      clientId, 
      submittedByName 
    } = req.body as ReportSubmitRequest;

    if (!title || !description || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ status: "error", message: "Missing required fields." });
    }

    // Strict validation: Complaints can ONLY be registered in India!
    const latNum = Number(latitude);
    const lngNum = Number(longitude);
    if (latNum < 8.0 || latNum > 36.0 || lngNum < 68.0 || lngNum > 98.0) {
      return res.status(400).json({ 
        status: "error", 
        message: "Illegal Location: Complaints can only be registered within India bounds (Latitude: 8.0 ~ 36.0, Longitude: 68.0 ~ 98.0)." 
      });
    }

    // Default heuristics category and assignment mapping
    let category = "General Civic Issue";
    let severity: "Low" | "Medium" | "High" = "Medium";
    let summary = description.slice(0, 100);
    let recommendedAction = "Inspect location and assign response unit.";
    let assignedMunicipalCorporation = municipalCorporation && municipalCorporation !== "Auto" ? municipalCorporation : "";
    let analyzedByAI = false;

    // Build list of uploaded images
    let uploadedImagesList: { data: string; mimeType: string }[] = [];
    if (images && images.length > 0) {
      uploadedImagesList = images;
    } else if (image && image.data) {
      uploadedImagesList = [image];
    }

    // Prepare list of image URLs to save in database
    const savedImageUrls: string[] = uploadedImagesList.map(img => 
      `data:${img.mimeType};base64,${img.data.replace(/^data:image\/\w+;base64,/, "")}`
    );
    const primaryImageUrl = savedImageUrls.length > 0 
      ? savedImageUrls[0] 
      : "https://images.unsplash.com/photo-1599740831146-80a6b7cd909c?auto=format&fit=crop&q=80&w=600";

    // Call Gemini API if available and there are images
    if (aiClient && uploadedImagesList.length > 0) {
      try {
        console.log(`Analyzing ${uploadedImagesList.length} image(s) multimodally using gemini-3.5-flash...`);
        
        // Construct multimodal vision parts
        const inlineDataParts = uploadedImagesList.map(img => ({
          inlineData: {
            data: img.data.replace(/^data:image\/\w+;base64,/, ""),
            mimeType: img.mimeType,
          }
        }));

        const response = await aiClient.models.generateContent({
          model: "gemini-3.5-flash",
          contents: [
            ...inlineDataParts,
            {
              text: `Analyze these images of a civic/neighborhood issue in India (e.g., pothole, water leak, garbage pile, streetlight failure). 
Additional context from user:
- Title: "${title}"
- Description: "${description}"
- Precise Street Location: "${preciseLocation || 'Not provided'}"
- Landmarks Provided: "${landmarks || 'Not provided'}"
- Coordinates: Latitude ${latitude}, Longitude ${longitude}
- User Chosen Municipal Corporation: "${municipalCorporation || 'Auto-Detect'}"

Return a strict JSON object with:
- "category": Broad categorizer (e.g., "Road Hazard", "Streetlight & Utilities", "Trash & Dumping", "Vandalism & Graffiti", "Public Park Damage", "Water & Sewer")
- "severity": Must be exactly 'Low', 'Medium', or 'High' based on community hazard
- "summary": A clear, professional 1-sentence description summarizing the issue
- "recommended_action": What municipal authorities or field workers should do to solve this issue
- "assigned_corporation": Recommend the most appropriate Indian Municipal Corporation. 
  E.g. "Municipal Corporation of Delhi (MCD)" if near Delhi/NCR area,
       "Brihanmumbai Municipal Corporation (BMC)" if near Mumbai/Maharashtra area,
       "Bruhat Bengaluru Mahanagara Palike (BBMP)" if near Bengaluru/Karnataka,
       "Greater Chennai Corporation (GCC)" if near Chennai,
       "Kolkata Municipal Corporation (KMC)" if near Kolkata,
       "Greater Hyderabad Municipal Corporation (GHMC)" if near Hyderabad,
       or suggest the logical one based on the coordinates/landmarks. If the user specified a valid corp name, you may confirm and return that.`
            }
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                severity: { 
                  type: Type.STRING, 
                  description: "Must be 'Low', 'Medium', or 'High'" 
                },
                summary: { type: Type.STRING },
                recommended_action: { type: Type.STRING },
                assigned_corporation: { type: Type.STRING }
              },
              required: ["category", "severity", "summary", "recommended_action", "assigned_corporation"]
            }
          }
        });

        if (response.text) {
          const parsed = JSON.parse(response.text.trim());
          category = parsed.category || category;
          severity = (parsed.severity === "Low" || parsed.severity === "Medium" || parsed.severity === "High") 
            ? parsed.severity 
            : "Medium";
          summary = parsed.summary || summary;
          recommendedAction = parsed.recommended_action || recommendedAction;
          if (!assignedMunicipalCorporation || municipalCorporation === "Auto") {
            assignedMunicipalCorporation = parsed.assigned_corporation || "General Indian Municipal Authority";
          }
          analyzedByAI = true;
          console.log("Successfully categorized and routed via Gemini:", parsed);
        }
      } catch (geminiError) {
        console.error("Gemini analysis failed, falling back to local coordinates routing rule.", geminiError);
      }
    }

    // Local rule-based routing fallback if Gemini didn't set assigned corporation
    if (!assignedMunicipalCorporation || assignedMunicipalCorporation === "Auto") {
      if (latNum >= 28.3 && latNum <= 29.0 && lngNum >= 76.7 && lngNum <= 77.5) {
        assignedMunicipalCorporation = "Municipal Corporation of Delhi (MCD)";
      } else if (latNum >= 18.7 && latNum <= 19.4 && lngNum >= 72.6 && lngNum <= 73.2) {
        assignedMunicipalCorporation = "Brihanmumbai Municipal Corporation (BMC)";
      } else if (latNum >= 12.7 && latNum <= 13.2 && lngNum >= 77.3 && lngNum <= 77.9) {
        assignedMunicipalCorporation = "Bruhat Bengaluru Mahanagara Palike (BBMP)";
      } else if (latNum >= 12.8 && latNum <= 13.3 && lngNum >= 80.0 && lngNum <= 80.5) {
        assignedMunicipalCorporation = "Greater Chennai Corporation (GCC)";
      } else if (latNum >= 22.3 && latNum <= 22.8 && lngNum >= 88.1 && lngNum <= 88.6) {
        assignedMunicipalCorporation = "Kolkata Municipal Corporation (KMC)";
      } else {
        assignedMunicipalCorporation = "General Indian Municipal Authority";
      }
    }

    // Text keyword fallback for categories if AI is offline
    if (!analyzedByAI) {
      const txt = (title + " " + description).toLowerCase();
      if (txt.includes("pothole") || txt.includes("road") || txt.includes("asphalt") || txt.includes("street")) {
        category = "Road Hazard";
        severity = "High";
      } else if (txt.includes("light") || txt.includes("lamp") || txt.includes("power") || txt.includes("electricity")) {
        category = "Streetlight & Utilities";
        severity = "Medium";
      } else if (txt.includes("trash") || txt.includes("dump") || txt.includes("garbage") || txt.includes("mattress") || txt.includes("litter")) {
        category = "Trash & Dumping";
        severity = "Medium";
      } else if (txt.includes("water") || txt.includes("leak") || txt.includes("flood") || txt.includes("pipe")) {
        category = "Water & Sewer";
        severity = "High";
      }
    }

    // Proximity / Deduplication check (within 100 meters range)
    let potentialDuplicateOf: string | undefined = undefined;
    const MAX_DEDUPLICATION_RADIUS_METERS = 100;
    
    // Check in both active and resolved reports
    const allExisting = [...reports, ...resolvedReports];
    for (const r of allExisting) {
      if (r.status !== "Resolved") {
        const dist = getDistanceInMeters(latitude, longitude, r.latitude, r.longitude);
        if (dist <= MAX_DEDUPLICATION_RADIUS_METERS) {
          potentialDuplicateOf = r.id;
          break;
        }
      }
    }

    // Create report entry
    const newReport: CivicIssue = {
      id: "rep_" + Date.now().toString(36),
      title,
      description,
      latitude,
      longitude,
      imageUrl: primaryImageUrl,
      imageUrls: savedImageUrls,
      preciseLocation: preciseLocation || "",
      landmarks: landmarks || "",
      category,
      severity,
      summary,
      recommendedAction,
      upvotes: potentialDuplicateOf ? 1 : 0,
      status: "Reported",
      createdAt: new Date().toISOString(),
      potentialDuplicateOf,
      submittedBy: clientId,
      submittedByName: submittedByName || "Verified Resident",
      assignedMunicipalCorporation,
    };

    reports.unshift(newReport);
    saveReports(reports);
    res.status(201).json({ status: "success", data: newReport, analyzedByAI });
  } catch (error) {
    console.error("Error saving report:", error);
    res.status(500).json({ status: "error", message: "Failed to submit report. Please try again." });
  }
});

// 3. Upvote/verify a report
app.post("/api/reports/:id/upvote", (req, res) => {
  const { id } = req.params;
  const { clientId } = req.body;
  
  // Look in both active and resolved databases
  let report = reports.find((r) => r.id === id);
  let isResolved = false;
  if (!report) {
    report = resolvedReports.find((r) => r.id === id);
    isResolved = true;
  }

  if (!report) {
    return res.status(404).json({ status: "error", message: "Report not found." });
  }

  if (clientId) {
    if (!report.upvotedBy) {
      report.upvotedBy = [];
    }
    if (report.upvotedBy.includes(clientId)) {
      return res.status(400).json({ status: "error", message: "You have already upvoted this report." });
    }
    report.upvotedBy.push(clientId);
  }

  report.upvotes += 1;
  if (isResolved) {
    saveResolvedReports(resolvedReports);
  } else {
    saveReports(reports);
  }
  res.json({ status: "success", data: report });
});

// 4. Update Status (With database move on Resolution)
app.post("/api/reports/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (status !== "Reported" && status !== "In Progress" && status !== "Resolved") {
    return res.status(400).json({ status: "error", message: "Invalid status." });
  }

  // Find index in active list
  let activeIdx = reports.findIndex((r) => r.id === id);
  let resolvedIdx = resolvedReports.findIndex((r) => r.id === id);
  let report: CivicIssue | undefined;

  if (activeIdx !== -1) {
    report = reports[activeIdx];
  } else if (resolvedIdx !== -1) {
    report = resolvedReports[resolvedIdx];
  }

  if (!report) {
    return res.status(404).json({ status: "error", message: "Report not found." });
  }
  
  report.status = status;

  if (status === "Resolved" && activeIdx !== -1) {
    // 🚚 Move from active database to resolved database permanently!
    reports.splice(activeIdx, 1);
    resolvedReports.unshift(report);
    saveReports(reports);
    saveResolvedReports(resolvedReports);
    console.log(`Moved resolved report ${id} to resolved database.`);
  } else if (status !== "Resolved" && resolvedIdx !== -1) {
    // 🚚 Revert/move back from resolved database to active database!
    resolvedReports.splice(resolvedIdx, 1);
    reports.unshift(report);
    saveReports(reports);
    saveResolvedReports(resolvedReports);
    console.log(`Reverted resolved report ${id} back to active database.`);
  } else {
    // Save state in respective database
    if (activeIdx !== -1) {
      saveReports(reports);
    } else {
      saveResolvedReports(resolvedReports);
    }
  }

  res.json({ status: "success", data: report });
});

// 5. Update Point of Contact (POC) details for a report
app.post("/api/reports/:id/poc", (req, res) => {
  const { id } = req.params;
  const { name, department, phone, email, notes } = req.body;

  const report = reports.find((r) => r.id === id);
  if (!report) {
    return res.status(404).json({ status: "error", message: "Report not found." });
  }

  report.poc = {
    name: name || "",
    department: department || "",
    phone: phone || "",
    email: email || "",
    notes: notes || ""
  };

  saveReports(reports);
  res.json({ status: "success", data: report });
});

// 6. Update Resolved Photos for a report
app.post("/api/reports/:id/resolved-photos", async (req, res) => {
  const { id } = req.params;
  const { image } = req.body;

  const report = [...reports, ...resolvedReports].find((r) => r.id === id);
  if (!report) {
    return res.status(404).json({ status: "error", message: "Report not found." });
  }

  try {
    if (image && image.data && image.mimeType) {
      // Mock Cloudinary upload
      const dummyUrl = `https://images.unsplash.com/photo-1541888086425-d81bb19240f5?auto=format&fit=crop&q=80&w=600&mock=${Date.now()}`;
      report.resolvedImageUrl = dummyUrl;
      report.resolvedImageUrls = [dummyUrl];
    }
    
    // Auto-resolve when uploading completion photo
    report.status = "Resolved";
    
    // Move to resolvedReports if it was in active reports
    const indexInActive = reports.findIndex(r => r.id === report.id);
    if (indexInActive !== -1) {
      reports.splice(indexInActive, 1);
      resolvedReports.unshift(report);
    }
    
    saveReports(reports);
    saveResolvedReports(resolvedReports);

    res.json({ status: "success", data: report });
  } catch (err: any) {
    console.error("Error uploading resolved photo:", err);
    res.status(500).json({ status: "error", message: "Failed to upload photo." });
  }
});

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Mount Vite middleware in development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve built static files
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MyNeighbourhood server running on http://localhost:${PORT}`);
  });
}

startServer();
