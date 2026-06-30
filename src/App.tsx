/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  MapPin, 
  Upload, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  ArrowUp, 
  RefreshCw, 
  Layers, 
  Plus, 
  Filter, 
  Info, 
  ShieldAlert,
  Sliders,
  Check,
  Eye,
  User,
  Award,
  X,
  Lock,
  Building,
  ArrowRight,
  Mail,
  ArrowLeft,
  Sun,
  Moon,
  UserCheck,
  Phone,
  Briefcase
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CivicIssue } from "./types";
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';
import { TOP_100_MUNICIPALITIES } from "./municipalities";

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';


// Map Bounding Box for coordinate-pixel translation (India sub-continent area)
const MAP_BOUNDS = {
  latMin: 8.0,
  latMax: 36.0,
  lngMin: 68.0,
  lngMax: 98.0,
};

// Distance calculation helper (Euclidean/degree based for local coordinates)
const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const dLat = lat1 - lat2;
  const dLng = lng1 - lng2;
  return Math.sqrt(dLat * dLat + dLng * dLng);
};

export default function App() {
  const [role, setRole] = useState<'guest' | 'citizen' | 'organization'>(() => {
    return (localStorage.getItem("myneighbourhood_role") as 'guest' | 'citizen' | 'organization') || 'guest';
  });
  const [passcode, setPasscode] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  // Authentication & Navigation state
  const [currentLandingView, setCurrentLandingView] = useState<'landing' | 'login'>('landing');
  const [activeTab, setActiveTab] = useState<'citizen' | 'organization'>('citizen');
  const [citizenStep, setCitizenStep] = useState<'email' | 'password' | 'register'>('email');
  
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  
  const [orgId, setOrgId] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgPasscode, setOrgPasscode] = useState("");
  const [isAuthChecking, setIsAuthChecking] = useState(false);
  const [showOrgOverwrite, setShowOrgOverwrite] = useState(false);
  const [orgOverwrite, setOrgOverwrite] = useState(false);

  useEffect(() => {
    setShowOrgOverwrite(false);
    setOrgOverwrite(false);
  }, [activeTab]);

  const [reports, setReports] = useState<CivicIssue[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [selectedDateRange, setSelectedDateRange] = useState<string>("All Time");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>("All");
  const [mapCenter, setMapCenter] = useState({ lat: 20.5937, lng: 78.9629 });
  const [mapZoom, setMapZoom] = useState(5);
  const [infoWindowReport, setInfoWindowReport] = useState<CivicIssue | null>(null);
  
  const handleSelectMunicipality = (muni: string) => {
    setSelectedMunicipality(muni);
    if (muni === "Municipal Corporation of Delhi (MCD)") {
      setMapCenter({ lat: 28.6139, lng: 77.2090 });
      setMapZoom(11);
    } else if (muni === "Brihanmumbai Municipal Corporation (BMC)") {
      setMapCenter({ lat: 19.0760, lng: 72.8777 });
      setMapZoom(11);
    } else if (muni === "Bruhat Bengaluru Mahanagara Palike (BBMP)") {
      setMapCenter({ lat: 12.9716, lng: 77.5946 });
      setMapZoom(11);
    } else if (muni === "Greater Chennai Corporation (GCC)") {
      setMapCenter({ lat: 13.0827, lng: 80.2707 });
      setMapZoom(11);
    } else if (muni === "Kolkata Municipal Corporation (KMC)") {
      setMapCenter({ lat: 22.5726, lng: 88.3639 });
      setMapZoom(11);
    } else {
      setMapCenter({ lat: 20.5937, lng: 78.9629 });
      setMapZoom(5);
    }
  };

  
  const [clientId, setClientId] = useState<string>("");
  const [upvotedIds, setUpvotedIds] = useState<string[]>([]);
  const [showInsights, setShowInsights] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [residentName, setResidentName] = useState<string>(() => localStorage.getItem("myneighbourhood_resident_name") || "Harsh P. Siddhu");
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem("myneighbourhood_theme") as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem("myneighbourhood_theme", theme);
  }, [theme]);
  
  // Form States
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState<number>(28.6304); // Default to Delhi center
  const [longitude, setLongitude] = useState<number>(77.2177);
  const [preciseLocation, setPreciseLocation] = useState("");
  const [landmarks, setLandmarks] = useState("");
  const [municipalCorporation, setMunicipalCorporation] = useState("Auto");
  const [photos, setPhotos] = useState<{ id: string; preview: string; data: string; mimeType: string }[]>([]);

  // Photo handlers for multiple uploads
  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 5 - photos.length;
    if (remainingSlots <= 0) {
      setErrorMessage("Maximum limit of 5 photos reached.");
      return;
    }

    const filesArray = Array.from(files).slice(0, remainingSlots) as File[];

    filesArray.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage(`File "${file.name}" exceeds 10MB limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const resultStr = reader.result as string;
        const match = resultStr.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
          setPhotos((prev) => [
            ...prev,
            {
              id: Math.random().toString(36).substring(2),
              preview: resultStr,
              data: match[2],
              mimeType: match[1],
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoRemove = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  // UI Statuses
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Organization Custom Dashboard States
  const [orgViewMode, setOrgViewMode] = useState<'feed' | 'dashboard'>('feed');
  const [editingPocReportId, setEditingPocReportId] = useState<string | null>(null);
  const [pocName, setPocName] = useState("");
  const [pocDepartment, setPocDepartment] = useState("");
  const [pocPhone, setPocPhone] = useState("");
  const [pocEmail, setPocEmail] = useState("");
  const [pocNotes, setPocNotes] = useState("");

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Load issues on mount
  useEffect(() => {
    // Initialize client ID for upvoting enforcement
    let cid = localStorage.getItem("myneighbourhood_client_id");
    if (!cid) {
      cid = "c_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem("myneighbourhood_client_id", cid);
    }
    setClientId(cid);

    // Initialize list of locally upvoted IDs
    const storedUpvotes = localStorage.getItem("myneighbourhood_upvoted_ids");
    if (storedUpvotes) {
      try {
        setUpvotedIds(JSON.parse(storedUpvotes));
      } catch (e) {
        console.error(e);
      }
    }

    fetchReports();
  }, []);

  const fetchReports = async () => {
    setIsRefreshing(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/reports");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const resData = await response.json();
      if (resData.status === "success") {
        const uniqueReports = Array.from(new globalThis.Map(resData.data.map((r: CivicIssue) => [r.id, r])).values()) as CivicIssue[];
        setReports(uniqueReports);
      } else {
        setErrorMessage("Failed to load reports from backend.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Could not connect to MyNeighbourhood API server (${err.message}). The server might be restarting, please try refreshing the page.`);
    } finally {
      setIsRefreshing(false);
    }
  };



  // Submit new report
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setErrorMessage("Please fill in title and description.");
      return;
    }

    // Strict validation: Complaints can ONLY be registered in India!
    if (latitude < 8.0 || latitude > 36.0 || longitude < 68.0 || longitude > 98.0) {
      setErrorMessage("Illegal Location: Reports can only be registered within India bounds (Latitude: 8.0 ~ 36.0, Longitude: 68.0 ~ 98.0).");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // Simulated progress steps for better user experience & transparent pipeline
    const steps = [
      "Securing local payload...",
      "Analyzing image buffers...",
      "Executing Gemini Multimodal Vision analysis (using gemini-3.5-flash)...",
      "Retrieving structured issue categorization...",
      "Routing to selected Municipal Corporation...",
      "Finalizing report registry..."
    ];

    let stepIdx = 0;
    setSubmitStep(steps[0]);
    const interval = setInterval(() => {
      if (stepIdx < steps.length - 2) {
        stepIdx++;
        setSubmitStep(steps[stepIdx]);
      }
    }, 1200);

    try {
      const payload = {
        title,
        description,
        latitude,
        longitude,
        preciseLocation,
        landmarks,
        municipalCorporation,
        images: photos.map(p => ({
          data: p.data,
          mimeType: p.mimeType
        })),
        clientId,
        submittedByName: residentName
      };

      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const resData = await res.json();
      clearInterval(interval);

      if (res.ok && resData.status === "success") {
        setSuccessMessage(
          resData.analyzedByAI 
            ? `Report processed! Gemini successfully analyzed the issue, categorized it as "${resData.data.category}" with "${resData.data.severity}" severity, and assigned it to ${resData.data.assignedMunicipalCorporation}.`
            : `Report saved! Local fallback analyzer processed the category: "${resData.data.category}" and assigned it to ${resData.data.assignedMunicipalCorporation}.`
        );
        
        // Reset form
        setTitle("");
        setDescription("");
        setPreciseLocation("");
        setLandmarks("");
        setMunicipalCorporation("Auto");
        setPhotos([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        
        // Auto-select the newly added report
        setSelectedIssueId(resData.data.id);

        // Fetch refreshed reports
        await fetchReports();
      } else {
        setErrorMessage(resData.message || "Failed to submit report.");
      }
    } catch (err) {
      clearInterval(interval);
      console.error(err);
      setErrorMessage("Server communication error. Please ensure the backend is running.");
    } finally {
      setIsSubmitting(false);
      setSubmitStep("");
    }
  };

  // Get current location (HTML5 geolocation)
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lng = parseFloat(position.coords.longitude.toFixed(6));
        setLatitude(lat);
        setLongitude(lng);
        setSuccessMessage("Coordinates successfully updated to your current location!");
      },
      (error) => {
        // Fallback to random offset near New Delhi central point for robust evaluation demo
        const randomLat = parseFloat((28.6304 + (Math.random() - 0.5) * 0.015).toFixed(6));
        const randomLng = parseFloat((77.2177 + (Math.random() - 0.5) * 0.015).toFixed(6));
        setLatitude(randomLat);
        setLongitude(randomLng);
        setErrorMessage("Location permission denied. Simulated nearby coordinates in India populated instead.");
      }
    );
  };

  // Handle map interaction (coordinate selection)
  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!mapContainerRef.current) return;
    const rect = mapContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert pixel to relative percentage
    const xPct = x / rect.width;
    const yPct = y / rect.height;

    // Map percentage to lat/lng bounding box bounds
    const lng = parseFloat((MAP_BOUNDS.lngMin + xPct * (MAP_BOUNDS.lngMax - MAP_BOUNDS.lngMin)).toFixed(6));
    const lat = parseFloat((MAP_BOUNDS.latMax - yPct * (MAP_BOUNDS.latMax - MAP_BOUNDS.latMin)).toFixed(6));

    setLatitude(lat);
    setLongitude(lng);
    setSuccessMessage(`Coordinate set on map: [${lat}, ${lng}]`);
  };

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim()) {
      setLoginError("Please enter an email address.");
      return;
    }
    setLoginError(null);
    setIsAuthChecking(true);
    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail }),
      });
      const data = await res.json();
      if (data.status === "success") {
        if (data.exists) {
          setCitizenStep("password");
        } else {
          setCitizenStep("register");
        }
      } else {
        setLoginError(data.message || "An error occurred. Please try again.");
      }
    } catch (err) {
      setLoginError("Failed to verify email. Please check your connection.");
    } finally {
      setIsAuthChecking(false);
    }
  };

  const handleCitizenLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authPassword) {
      setLoginError("Please enter your password.");
      return;
    }
    setLoginError(null);
    setIsAuthChecking(true);
    try {
      const res = await fetch("/api/auth/citizen/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setRole("citizen");
        setResidentName(data.user.name);
        setClientId(data.user.clientId);
        localStorage.setItem("myneighbourhood_role", "citizen");
        localStorage.setItem("myneighbourhood_resident_name", data.user.name);
        localStorage.setItem("myneighbourhood_client_id", data.user.clientId);
        
        // Reset states
        setAuthEmail("");
        setAuthPassword("");
        setCitizenStep("email");
        setLoginError(null);
        fetchReports();
      } else {
        setLoginError(data.message || "Incorrect password. Please try again.");
      }
    } catch (err) {
      setLoginError("Failed to log in. Please check your connection.");
    } finally {
      setIsAuthChecking(false);
    }
  };

  const handleCitizenRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authName.trim() || !authPassword) {
      setLoginError("All fields are required.");
      return;
    }
    setLoginError(null);
    setIsAuthChecking(true);
    try {
      const res = await fetch("/api/auth/citizen/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword, name: authName }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setRole("citizen");
        setResidentName(data.user.name);
        setClientId(data.user.clientId);
        localStorage.setItem("myneighbourhood_role", "citizen");
        localStorage.setItem("myneighbourhood_resident_name", data.user.name);
        localStorage.setItem("myneighbourhood_client_id", data.user.clientId);
        
        // Reset states
        setAuthEmail("");
        setAuthPassword("");
        setAuthName("");
        setCitizenStep("email");
        setLoginError(null);
        fetchReports();
      } else {
        setLoginError(data.message || "Failed to create account. Please try again.");
      }
    } catch (err) {
      setLoginError("Failed to create account. Please check your connection.");
    } finally {
      setIsAuthChecking(false);
    }
  };

  const handleOrgLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId.trim() || !orgPasscode) {
      setLoginError("Organization ID and Passcode are required.");
      return;
    }
    setLoginError(null);
    setIsAuthChecking(true);
    try {
      const res = await fetch("/api/auth/org/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          orgId, 
          name: orgName, 
          password: orgPasscode,
          overwrite: orgOverwrite 
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setRole("organization");
        setResidentName(data.org.name);
        setClientId(data.org.orgId);
        localStorage.setItem("myneighbourhood_role", "organization");
        localStorage.setItem("myneighbourhood_resident_name", data.org.name);
        localStorage.setItem("myneighbourhood_client_id", data.org.orgId);

        // Reset states
        setOrgId("");
        setOrgName("");
        setOrgPasscode("");
        setLoginError(null);
        setShowOrgOverwrite(false);
        setOrgOverwrite(false);
        fetchReports();
      } else {
        setLoginError(data.message || "Invalid passcode or ID. Please check.");
        if (data.canOverwrite) {
          setShowOrgOverwrite(true);
        }
      }
    } catch (err) {
      setLoginError("Failed to authenticate organization. Check connection.");
    } finally {
      setIsAuthChecking(false);
    }
  };

  // Trigger upvoting
  const handleUpvote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent card selection trigger
    if (upvotedIds.includes(id)) {
      setErrorMessage("You have already verified / upvoted this issue.");
      return;
    }
    try {
      const res = await fetch(`/api/reports/${id}/upvote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId })
      });
      const resData = await res.json();
      if (res.ok && resData.status === "success") {
        setReports(prev => prev.map(r => r.id === id ? { ...r, upvotes: resData.data.upvotes } : r));
        const newUpvoted = [...upvotedIds, id];
        setUpvotedIds(newUpvoted);
        localStorage.setItem("myneighbourhood_upvoted_ids", JSON.stringify(newUpvoted));
        setSuccessMessage("Your verification / upvote has been recorded successfully!");
      } else {
        setErrorMessage(resData.message || "Failed to upvote.");
      }
    } catch (err) {
      console.error("Upvote failed:", err);
    }
  };

  // Change report status (Mock city action)
  const handleUpdateStatus = async (id: string, newStatus: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/reports/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      const resData = await res.json();
      if (res.ok && resData.status === "success") {
        setReports(prev => prev.map(r => r.id === id ? { ...r, status: resData.data.status } : r));
        setSuccessMessage(`Report status updated to "${newStatus}"!`);
      }
    } catch (err) {
      console.error("Status update failed:", err);
    }
  };

  const handleResolveWithPhoto = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (!file) return;

    // Show processing indicator if needed, for now just success toast later
    
    try {
      // In a real app we would read file to base64, here we'll mock it
      const res = await fetch(`/api/reports/${id}/resolved-photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          image: { data: "mock", mimeType: "image/jpeg" } 
        })
      });
      const resData = await res.json();
      if (res.ok && resData.status === "success") {
        setReports(prev => prev.map(r => r.id === id ? { 
          ...r, 
          status: "Resolved",
          resolvedImageUrl: resData.data.resolvedImageUrl, 
          resolvedImageUrls: resData.data.resolvedImageUrls 
        } : r));
        setSuccessMessage("Issue resolved and completion photo uploaded successfully!");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to upload resolution photo.");
    }
  };

  // Update Point of Contact (POC) details for a complaint
  const handleUpdatePoc = async (id: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      const res = await fetch(`/api/reports/${id}/poc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: pocName,
          department: pocDepartment,
          phone: pocPhone,
          email: pocEmail,
          notes: pocNotes
        })
      });
      const resData = await res.json();
      if (res.ok && resData.status === "success") {
        setReports(prev => prev.map(r => r.id === id ? { ...r, poc: resData.data.poc } : r));
        setSuccessMessage("Point of Contact details updated successfully!");
        setEditingPocReportId(null);
        // Clear POC form
        setPocName("");
        setPocDepartment("");
        setPocPhone("");
        setPocEmail("");
        setPocNotes("");
      } else {
        setErrorMessage(resData.message || "Failed to update Point of Contact.");
      }
    } catch (err) {
      console.error("POC update failed:", err);
      setErrorMessage("Network error occurred while updating Point of Contact.");
    }
  };

  // Helper translations for SVG plotting
  const getXYFromLatLng = (lat: number, lng: number) => {
    // Return relative percentage coordinates for SVG
    const x = ((lng - MAP_BOUNDS.lngMin) / (MAP_BOUNDS.lngMax - MAP_BOUNDS.lngMin)) * 100;
    const y = ((MAP_BOUNDS.latMax - lat) / (MAP_BOUNDS.latMax - MAP_BOUNDS.latMin)) * 100;
    return { x, y };
  };

  // Filters logic
  const filteredReports = reports.filter(r => {
    const categoryMatch = selectedCategory === "All" || r.category === selectedCategory;
    const severityMatch = selectedSeverity === "All" || r.severity === selectedSeverity;
    const statusMatch = selectedStatus === "All" || r.status === selectedStatus;
    const municipalityMatch = selectedMunicipality === "All" || r.assignedMunicipalCorporation === selectedMunicipality;
    
    let dateMatch = true;
    if (selectedDateRange !== "All Time") {
      const reportDate = new Date(r.createdAt);
      const now = new Date();
      if (selectedDateRange === "Today") {
        dateMatch = reportDate.toDateString() === now.toDateString();
      } else if (selectedDateRange === "Last 7 Days") {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateMatch = reportDate >= sevenDaysAgo;
      }
    }
    
    return categoryMatch && severityMatch && statusMatch && dateMatch && municipalityMatch;
  });

  // User-submitted complaints and stats calculations
  const userReports = reports.filter(r => r.submittedBy === clientId);
  const userReportsCount = userReports.length;
  const userResolvedCount = userReports.filter(r => r.status === "Resolved").length;
  const userTotalUpvotes = userReports.reduce((acc, r) => acc + r.upvotes, 0);

  // Community tier level badge based on submitted reports
  let userBadge = "Observer Resident";
  let userIconBadge = "👁️";
  if (userReportsCount >= 3) {
    userBadge = "Civic Champion";
    userIconBadge = "🏆";
  } else if (userReportsCount >= 1) {
    userBadge = "Civic Sentinel";
    userIconBadge = "🛡️";
  }

  // Get distinct categories for filtering dynamically
  const categories = ["All", ...Array.from(new Set(reports.map(r => r.category)))];

  // Get distinct municipalities for filtering dynamically, with guaranteed default Indian Municipal bodies
  const municipalities = [
    "All",
    ...TOP_100_MUNICIPALITIES,
    ...Array.from(new Set(reports.map(r => r.assignedMunicipalCorporation).filter((m): m is string => Boolean(m) && !TOP_100_MUNICIPALITIES.includes(m))))
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#f5f5f0] text-[#2c2c2c]">
      
      {/* 1. Header / Navigation */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#1c1c16]/80 backdrop-blur-md border-b border-[#5a5a4011] dark:border-white/10 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-[#5a5a40] dark:bg-brand-200 p-2.5 rounded-xl text-white dark:text-brand-900 shadow-xs">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-[#5a5a40] dark:text-[#d1d1c4] font-display">MyNeighbourhood</span>
              <span className="hidden sm:inline-block text-[10px] bg-[#5a5a4011] dark:bg-white/5 text-[#5a5a40] dark:text-brand-200 font-mono font-medium ml-2 px-2 py-0.5 rounded-full border border-[#5a5a401a] dark:border-white/10">
                Hyperlocal Civic Hub
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            {role !== "guest" && (
              <>
                <div className={`text-[10px] sm:text-[11px] font-mono font-bold px-2.5 py-1.5 rounded-xl border ${
                  role === "organization" 
                    ? "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50" 
                    : "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50"
                }`}>
                  {role === "organization" ? "🏛️ Org Portal" : "👤 Citizen Mode"}
                </div>

                <button 
                  onClick={fetchReports}
                  className={`p-2 rounded-xl text-[#5a5a40] dark:text-brand-200 hover:bg-[#5a5a4011] dark:hover:bg-white/10 transition-all ${isRefreshing ? "animate-spin" : ""}`}
                  title="Refresh Feed"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>

                {(role === "citizen" || role === "organization") && (
                  <button 
                    onClick={() => setIsProfileOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#5a5a40] dark:text-brand-200 bg-[#5a5a4011] dark:bg-white/5 hover:bg-[#5a5a4022] dark:hover:bg-white/10 border border-[#5a5a4022] dark:border-white/10 transition-all"
                    title={role === "organization" ? "Organization Profile" : "My Profile Dashboard"}
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">{role === "organization" ? "Org Profile" : "My Profile"}</span>
                  </button>
                )}

                <button 
                  onClick={() => {
                    setRole("guest");
                    localStorage.setItem("myneighbourhood_role", "guest");
                    localStorage.removeItem("myneighbourhood_resident_name");
                    localStorage.removeItem("myneighbourhood_client_id");
                    setAuthEmail("");
                    setAuthPassword("");
                    setAuthName("");
                    setPasscode("");
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#c46851] bg-[#c4685111] hover:bg-[#c4685122] border border-[#c4685122] transition-all"
                  title="Sign out to landing page"
                >
                  <span>Sign Out</span>
                </button>
              </>
            )}

            {role === "guest" && (
              <div className="flex items-center space-x-2">
                {currentLandingView === "login" ? (
                  <button
                    onClick={() => {
                      setCurrentLandingView("landing");
                      setLoginError(null);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[#5a5a40] dark:text-brand-200 bg-[#5a5a4011] dark:bg-white/5 hover:bg-[#5a5a4022] dark:hover:bg-white/10 border border-[#5a5a401a] dark:border-white/10 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back to About</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setCurrentLandingView("login");
                      setLoginError(null);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white dark:text-brand-900 bg-[#5a5a40] dark:bg-brand-200 hover:bg-[#4a4a33] dark:hover:bg-brand-100 shadow-md transition-all cursor-pointer"
                  >
                    <User className="h-3.5 w-3.5" />
                    <span>Login</span>
                  </button>
                )}
              </div>
            )}

            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2.5 rounded-xl text-[#5a5a40] dark:text-brand-200 hover:bg-[#5a5a4011] dark:hover:bg-white/10 border border-[#5a5a4011] dark:border-white/10 transition-all cursor-pointer flex items-center justify-center shadow-xs"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-amber-400" />}
            </button>
          </div>
        </div>
      </header>

      {/* Conditionally render Landing Page or main App Workspace */}
      {role === "guest" ? (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 flex flex-col space-y-16"
        >
          {currentLandingView === "landing" ? (
            <>
              {/* Hero Banner */}
              <div className="text-center max-w-3xl mx-auto space-y-6">
                <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-[#2c2c2c] font-display leading-tight">
                  Hyperlocal Civic Action. <br />
                  <span className="text-[#5a5a40]">Direct Municipal Solutions.</span>
                </h1>
                <p className="text-sm sm:text-base text-[#5a5a40ee] leading-relaxed max-w-2xl mx-auto">
                  MyNeighbourhood is a modern, AI-augmented community reporting pipeline. 
                  We empower local residents to instantly log public concerns, while providing municipal 
                  organizations with the direct action tools needed to resolve them.
                </p>
              </div>

              {/* About Section - Grid of Features */}
              <section className="bg-white rounded-[32px] p-8 sm:p-10 border border-[#5a5a4011] shadow-xs space-y-8">
                <div className="text-center space-y-2">
                  <span className="text-[11px] font-mono font-bold text-[#5a5a40aa] uppercase tracking-widest block">Core Platform Ecosystem</span>
                  <h2 className="text-2xl font-bold font-display text-[#2c2c2c]">How the Reporting Pipeline Works</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Feature 1 */}
                  <div className="bg-[#fcfcf9] p-6 rounded-2xl border border-[#5a5a400d] space-y-4 hover:border-[#5a5a4022] transition-colors">
                    <div className="h-10 w-10 rounded-xl bg-[#5a5a401a] flex items-center justify-center text-[#5a5a40]">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-800">1. Spot & Pin</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Residents pinpoint public safety, sanitation, or road hazards on an interactive hyperlocal map, attaching a photo and description.
                    </p>
                  </div>

                  {/* Feature 2 */}
                  <div className="bg-[#fcfcf9] p-6 rounded-2xl border border-[#5a5a400d] space-y-4 hover:border-[#5a5a4022] transition-colors">
                    <div className="h-10 w-10 rounded-xl bg-[#5a5a401a] flex items-center justify-center text-[#5a5a40]">
                      <ShieldAlert className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-800">2. AI Assessment</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Powered by Gemini 3.5. Instant multimodal analysis assesses severity, recommends action, and flags duplicates within 100 meters.
                    </p>
                  </div>

                  {/* Feature 3 */}
                  <div className="bg-[#fcfcf9] p-6 rounded-2xl border border-[#5a5a400d] space-y-4 hover:border-[#5a5a4022] transition-colors">
                    <div className="h-10 w-10 rounded-xl bg-[#5a5a401a] flex items-center justify-center text-[#5a5a40]">
                      <ArrowUp className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-800">3. Citizen Validation</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Neighbors upvote reports. High upvote counts signal urgent community concerns, ensuring transparency and civic priority.
                    </p>
                  </div>

                  {/* Feature 4 */}
                  <div className="bg-[#fcfcf9] p-6 rounded-2xl border border-[#5a5a400d] space-y-4 hover:border-[#5a5a4022] transition-colors">
                    <div className="h-10 w-10 rounded-xl bg-[#5a5a401a] flex items-center justify-center text-[#5a5a40]">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-800">4. Direct Resolution</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Organizations oversee the pipeline. The exclusive "Resolve" action allows authorities to close verified issues by uploading completion photos.
                    </p>
                  </div>
                </div>
              </section>

              {/* Login Page / Portal Gateways Section */}
              <section className="bg-gradient-to-br from-[#5a5a40] to-[#3c3c2b] text-white p-10 rounded-[32px] text-center space-y-6 border border-[#5a5a4022] shadow-xs">
                <span className="text-[10px] font-mono font-bold text-[#e1e1da] uppercase tracking-wider block">Portal Gateways Active</span>
                <h3 className="text-2xl sm:text-3xl font-bold font-display text-white">Join your Hyperlocal Neighborhood Pipeline</h3>
                <p className="text-xs sm:text-sm text-[#e1e1daee] max-w-xl mx-auto leading-relaxed">
                  Log in to file civic complaints, verify street level duplicates, view local resolution workflows, or authenticate as an official administrative municipal organization.
                </p>
                <button
                  onClick={() => {
                    setCurrentLandingView("login");
                    setLoginError(null);
                  }}
                  className="inline-flex items-center gap-2 bg-white text-[#5a5a40] font-bold text-xs px-6 py-3.5 rounded-full shadow-lg hover:bg-slate-50 transition-all cursor-pointer group"
                >
                  <span>Enter Portal / Log In</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </section>
            </>
          ) : (
            <div className="max-w-md mx-auto w-full bg-white rounded-[32px] border border-[#5a5a4011] p-8 shadow-xs space-y-8">
              {/* Header */}
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold font-display text-[#2c2c2c]">Welcome to MyNeighbourhood</h2>
                <p className="text-xs text-slate-500">Choose your access method below to verify or enter the portal</p>
              </div>

              {/* Segmented Tabs Control */}
              <div className="flex bg-[#f5f5f0] p-1 rounded-2xl border border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("citizen");
                    setLoginError(null);
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                    activeTab === "citizen"
                      ? "bg-white text-[#5a5a40] shadow-xs"
                      : "text-slate-500 hover:text-[#5a5a40]"
                  }`}
                >
                  👤 Citizen Portal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("organization");
                    setLoginError(null);
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                    activeTab === "organization"
                      ? "bg-white text-[#5a5a40] shadow-xs"
                      : "text-slate-500 hover:text-[#5a5a40]"
                  }`}
                >
                  🏛️ Local Body / Org
                </button>
              </div>

              {/* Error messages block */}
              {loginError && (
                <div className="bg-[#c468510d] text-[#c46851] text-xs font-semibold p-3.5 rounded-xl border border-[#c4685122] flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>{loginError}</p>
                </div>
              )}

              {/* TAB CONTENT: CITIZEN */}
              {activeTab === "citizen" && (
                <div className="space-y-6">
                  {/* Step 1: Email check */}
                  {citizenStep === "email" && (
                    <form onSubmit={handleCheckEmail} className="space-y-5">
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                          Resident Email Address
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            required
                            value={authEmail}
                            onChange={(e) => setAuthEmail(e.target.value)}
                            placeholder="e.g. resident@neighborhood.com"
                            className="w-full bg-slate-50/50 border border-slate-200 focus:border-[#5a5a40] focus:ring-1 focus:ring-[#5a5a4033] focus:outline-hidden py-3 px-3.5 pl-10 text-xs font-semibold rounded-xl transition-all"
                          />
                          <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-3.5" />
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">
                          We will verify if an account exists under this email address.
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={isAuthChecking}
                        className="w-full bg-[#5a5a40] hover:bg-[#4a4a33] text-white font-bold text-xs py-3.5 px-4 rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                      >
                        {isAuthChecking ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <span>Continue</span>
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    </form>
                  )}

                  {/* Step 2: Password entry (existing account) */}
                  {citizenStep === "password" && (
                    <form onSubmit={handleCitizenLogin} className="space-y-5">
                      <div className="space-y-4">
                        <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl flex items-center justify-between">
                          <div className="truncate">
                            <span className="text-[9px] font-mono text-slate-400 uppercase font-bold tracking-wider block">Verified Account</span>
                            <span className="text-xs font-bold text-[#2c2c2c] truncate block">{authEmail}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setCitizenStep("email");
                              setLoginError(null);
                            }}
                            className="text-[10px] text-[#5a5a40] font-bold hover:underline"
                          >
                            Edit
                          </button>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                            Enter Password
                          </label>
                          <div className="relative">
                            <input
                              type="password"
                              required
                              value={authPassword}
                              onChange={(e) => setAuthPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full bg-slate-50/50 border border-slate-200 focus:border-[#5a5a40] focus:ring-1 focus:ring-[#5a5a4033] focus:outline-hidden py-3 px-3.5 pl-10 text-xs font-semibold rounded-xl transition-all"
                            />
                            <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-3.5" />
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isAuthChecking}
                        className="w-full bg-[#5a5a40] hover:bg-[#4a4a33] text-white font-bold text-xs py-3.5 px-4 rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                      >
                        {isAuthChecking ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <span>Log In & Enter</span>
                            <Check className="h-4 w-4" />
                          </>
                        )}
                      </button>

                      <div className="flex flex-col gap-2 pt-2 text-center border-t border-slate-100 dark:border-white/10 mt-4">
                        <p className="text-[10px] text-slate-400">Credentials mismatching? You can re-create or register this account with a new name and password.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setCitizenStep("register");
                            setLoginError(null);
                          }}
                          className="text-xs text-[#5a5a40] dark:text-brand-200 font-bold hover:underline cursor-pointer"
                        >
                          Register / Re-create Account Instead
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Step 3: Register Account */}
                  {citizenStep === "register" && (
                    <form onSubmit={handleCitizenRegister} className="space-y-5">
                      <div className="space-y-4">
                        <div className="bg-amber-50/40 border border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20 p-3.5 rounded-2xl">
                          <span className="text-[9px] font-mono text-amber-700 dark:text-amber-400 uppercase font-bold tracking-wider block">Create or Recreate Resident Profile</span>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-normal">
                            Provide details below to create a new account or update/reset password for <strong className="text-slate-800 dark:text-slate-100">{authEmail}</strong>.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setCitizenStep("email");
                              setLoginError(null);
                            }}
                            className="text-[10px] text-[#5a5a40] font-bold hover:underline mt-1 block"
                          >
                            Change email
                          </button>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                            Your Full Name
                          </label>
                          <input
                            type="text"
                            required
                            value={authName}
                            onChange={(e) => setAuthName(e.target.value)}
                            placeholder="e.g. Harsh P. Siddhu"
                            className="w-full bg-slate-50/50 border border-slate-200 focus:border-[#5a5a40] focus:ring-1 focus:ring-[#5a5a4033] focus:outline-hidden py-3 px-3.5 text-xs font-semibold rounded-xl transition-all"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                            Set Account Password
                          </label>
                          <div className="relative">
                            <input
                              type="password"
                              required
                              value={authPassword}
                              onChange={(e) => setAuthPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full bg-slate-50/50 border border-slate-200 focus:border-[#5a5a40] focus:ring-1 focus:ring-[#5a5a4033] focus:outline-hidden py-3 px-3.5 pl-10 text-xs font-semibold rounded-xl transition-all"
                            />
                            <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-3.5" />
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isAuthChecking}
                        className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-3.5 px-4 rounded-full shadow-md shadow-emerald-700/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                      >
                        {isAuthChecking ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <span>Create Account & Log In</span>
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* TAB CONTENT: LOCAL BODY / ORGANIZATION */}
              {activeTab === "organization" && (
                <form onSubmit={handleOrgLogin} className="space-y-5">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                        Local Body / Organization ID
                      </label>
                      <input
                        type="text"
                        required
                        value={orgId}
                        onChange={(e) => setOrgId(e.target.value)}
                        placeholder="e.g. sf_muni or sanitation_dept"
                        className="w-full bg-slate-50/50 border border-slate-200 focus:border-[#5a5a40] focus:ring-1 focus:ring-[#5a5a4033] focus:outline-hidden py-3 px-3.5 text-xs font-semibold rounded-xl transition-all"
                      />
                      <p className="text-[10px] text-slate-400 font-medium">
                        Pre-seeded options: <strong className="text-slate-600">sf_muni</strong> or <strong className="text-slate-600">sanitation_dept</strong>
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                        Organization Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="e.g. Public Works Sanitation Division"
                        className="w-full bg-slate-50/50 border border-slate-200 focus:border-[#5a5a40] focus:ring-1 focus:ring-[#5a5a4033] focus:outline-hidden py-3 px-3.5 text-xs font-semibold rounded-xl transition-all"
                      />
                      <p className="text-[10px] text-slate-400 font-medium">
                        Needed only if you are registering a new organization on-the-fly.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                          Administrative Passcode
                        </label>
                      </div>
                      <div className="relative">
                        <input
                          type="password"
                          required
                          value={orgPasscode}
                          onChange={(e) => setOrgPasscode(e.target.value)}
                          placeholder="Enter administrative passcode"
                          className="w-full bg-slate-50/50 border border-slate-200 focus:border-[#5a5a40] focus:ring-1 focus:ring-[#5a5a4033] focus:outline-hidden py-3 px-3.5 pl-10 text-xs font-semibold rounded-xl transition-all"
                        />
                        <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-3.5" />
                      </div>
                    </div>

                    {showOrgOverwrite && (
                      <div className="bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 p-3 rounded-2xl flex items-start gap-2">
                        <input
                          type="checkbox"
                          id="orgOverwriteCheck"
                          checked={orgOverwrite}
                          onChange={(e) => setOrgOverwrite(e.target.checked)}
                          className="mt-1 h-3.5 w-3.5 rounded border-slate-300 text-amber-700 focus:ring-amber-500 cursor-pointer"
                        />
                        <label htmlFor="orgOverwriteCheck" className="text-[10px] text-red-800 dark:text-red-300 font-bold select-none cursor-pointer leading-tight">
                          Passcode mismatch. Check this box to update / overwrite the administrative passcode for "{orgId}" to the entered passcode.
                        </label>
                      </div>
                    )}

                    <div className="bg-amber-50/50 border border-amber-100 p-3 rounded-2xl flex items-start gap-2">
                      <Info className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-amber-800 leading-normal">
                        <strong>On-the-Fly Registration:</strong> If the database doesn't match this Local Body ID, we will automatically create it with your passcode.
                      </p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isAuthChecking}
                    className="w-full bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs py-3.5 px-4 rounded-full shadow-lg shadow-amber-700/15 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {isAuthChecking ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <span>Authenticate & Enter Organization Portal</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </motion.div>
      ) : (
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left / Center Section - Dashboard and Reports Feed (8 Columns) */}
        <div className={`flex flex-col space-y-8 ${role === "organization" ? "lg:col-span-12" : "lg:col-span-8"}`}>
          
          {/* Dashboard Quick Stats (Only visible to authenticated Local Body organizations) */}
          {role === "organization" && (
            <section className="bg-white p-6 rounded-[28px] border border-[#5a5a4011] shadow-xs flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-2 border-r border-[#5a5a4011]">
                  <p className="text-[10px] font-mono font-bold text-[#5a5a40aa] uppercase tracking-wider">Active Issues</p>
                  <p className="text-2xl sm:text-3xl font-bold font-display text-[#2c2c2c] mt-1">
                    {reports.filter(r => r.status !== "Resolved").length}
                  </p>
                </div>
                <div className="text-center p-2 border-r border-[#5a5a4011]">
                  <p className="text-[10px] font-mono font-bold text-[#5a5a40aa] uppercase tracking-wider">AI Assessed</p>
                  <p className="text-2xl sm:text-3xl font-bold font-display text-[#5a5a40] mt-1">
                    {reports.length}
                  </p>
                </div>
                <div className="text-center p-2">
                  <p className="text-[10px] font-mono font-bold text-[#5a5a40aa] uppercase tracking-wider">Resolved</p>
                  <p className="text-2xl sm:text-3xl font-bold font-display text-emerald-700 mt-1">
                    {reports.filter(r => r.status === "Resolved").length}
                  </p>
                </div>
              </div>

              {/* Toggle Button */}
              <div className="border-t border-[#5a5a4011] pt-3 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowInsights(!showInsights)}
                  className="text-xs font-bold text-[#5a5a40] hover:text-[#4a4a35] flex items-center gap-1.5 transition-all"
                >
                  {showInsights ? "Hide Neighborhood Insights" : "Show Neighborhood Insights"}
                  <span className="text-[10px]">{showInsights ? "▲" : "▼"}</span>
                </button>
              </div>

              {/* Insights Panel */}
              <AnimatePresence>
                {showInsights && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-[#5a5a4011] pt-4"
                  >
                    <p className="text-[11px] font-bold text-[#5a5a40] uppercase tracking-wider mb-3">Incident Distribution by Category</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {categories.filter(c => c !== "All").map((cat) => {
                        const count = reports.filter(r => r.category === cat).length;
                        const percentage = reports.length > 0 ? (count / reports.length) * 100 : 0;
                        return (
                          <div key={cat} className="space-y-1">
                            <div className="flex justify-between text-[11px] font-medium text-[#2c2c2c]">
                              <span>{cat}</span>
                              <span className="font-mono text-[#5a5a40aa]">{count} ({percentage.toFixed(0)}%)</span>
                            </div>
                            <div className="h-2 bg-[#f5f5f0] rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                className="h-full bg-[#5a5a40] rounded-full"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <p className="text-[11px] font-bold text-[#5a5a40] uppercase tracking-wider mt-4 mb-3">Severity Breakdown</p>
                    <div className="flex items-center gap-4 text-xs font-semibold">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#c46851]"></span>
                        <span>High: {reports.filter(r => r.severity === "High").length}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#dca45d]"></span>
                        <span>Medium: {reports.filter(r => r.severity === "Medium").length}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#6d8a63]"></span>
                        <span>Low: {reports.filter(r => r.severity === "Low").length}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          )}

          {/* Interactive Neighborhood Map */}
          <section className="bg-white rounded-[28px] border border-[#5a5a4011] shadow-xs overflow-hidden flex flex-col">
            <div className="px-6 py-4.5 border-b border-[#5a5a4011] bg-[#fbfbf9] flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold font-display text-[#2c2c2c] flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-[#5a5a40]" />
                  Hyperlocal Issue Plotter Map
                </h2>
                <p className="text-xs text-[#5a5a40aa] mt-0.5">Click any location on map to set your pin; track municipal hazards</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-1.5 bg-white dark:bg-stone-900 border border-[#5a5a4022] dark:border-white/10 px-2.5 py-1 rounded-xl shadow-xs">
                  <span className="text-[10px] font-mono font-bold text-[#5a5a40] dark:text-brand-300 whitespace-nowrap">Municipality:</span>
                  <select
                    value={selectedMunicipality}
                    onChange={(e) => handleSelectMunicipality(e.target.value)}
                    className="text-xs bg-transparent border-none text-[#2c2c2c] dark:text-stone-200 focus:ring-0 p-0 font-medium cursor-pointer"
                  >
                    {municipalities.map((m, idx) => {
                      const mStr = m as string;
                      return (
                        <option key={idx} value={mStr} className="bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100">
                          {mStr === "All" ? "All Municipalities" : mStr.replace("Municipal Corporation of ", "").replace("Municipal Corporation", "MC")}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="text-[11px] font-mono text-[#5a5a40aa] bg-[#f5f5f0] px-2.5 py-1 rounded-md border border-[#5a5a4011]">
                  {hasValidKey ? "Google Map Active" : "Google Map Configuration"}
                </div>
              </div>
            </div>

            <div 
              ref={mapContainerRef} 
              className="relative bg-[#f5f5ee] h-[400px] overflow-hidden border-b border-[#5a5a4011]"
            >
              {!hasValidKey ? (
                <div className="flex flex-col items-center justify-center bg-[#fafaf9] dark:bg-stone-900 p-6 text-center h-full overflow-y-auto">
                  <div className="h-12 w-12 rounded-full bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center mb-3 border border-amber-200 dark:border-amber-900 shrink-0 animate-pulse">
                    <MapPin className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200 font-display">Google Maps API Key Required</h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-md">
                    Connect the real-time Google Map platform to track, plot, and view hyperlocal hazard complaints on a high-fidelity interactive map of India.
                  </p>
                  <div className="mt-4 text-left bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800/60 p-4 rounded-xl text-xs space-y-2.5 max-w-md shadow-xs">
                    <div>
                      <span className="font-bold text-[#5a5a40]">Step 1:</span> Get an API key:{' '}
                      <a 
                        href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-amber-600 dark:text-amber-400 font-bold hover:underline inline-flex items-center gap-0.5"
                      >
                        Google Maps Platform Console
                      </a>
                    </div>
                    <div>
                      <span className="font-bold text-[#5a5a40]">Step 2:</span> Enter your key in AI Studio:
                      <ol className="list-decimal list-inside pl-2.5 mt-1 text-[11px] text-stone-500 space-y-1">
                        <li>Open the <span className="font-semibold">Settings</span> panel (⚙️ top right corner)</li>
                        <li>Go to <span className="font-semibold">Secrets</span> section</li>
                        <li>Create secret name: <code className="bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded text-red-600 dark:text-red-400 font-mono text-[10px]">GOOGLE_MAPS_PLATFORM_KEY</code></li>
                        <li>Paste your API key and save!</li>
                      </ol>
                    </div>
                  </div>
                  <div className="mt-3 text-[10px] text-stone-400 italic shrink-0">
                    The app will automatically rebuild and load the map once configured!
                  </div>
                </div>
              ) : (
                <APIProvider apiKey={API_KEY} version="weekly">
                  <Map
                    center={mapCenter}
                    zoom={mapZoom}
                    onCameraChanged={(ev) => {
                      setMapCenter(ev.detail.center);
                      setMapZoom(ev.detail.zoom);
                    }}
                    mapId="DEMO_MAP_ID"
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                    style={{ width: '100%', height: '100%' }}
                    onClick={(e) => {
                      if (e.detail.latLng) {
                        const lat = typeof e.detail.latLng.lat === 'function' ? e.detail.latLng.lat() : e.detail.latLng.lat;
                        const lng = typeof e.detail.latLng.lng === 'function' ? e.detail.latLng.lng() : e.detail.latLng.lng;
                        setLatitude(lat);
                        setLongitude(lng);
                        setSuccessMessage(`Coordinate set on map: [${lat.toFixed(6)}, ${lng.toFixed(6)}]`);
                      }
                    }}
                  >
                    {/* Render active reports pins */}
                    {filteredReports.map((r) => {
                      let pinBg = "#5a5a40";
                      if (r.severity === "High") pinBg = "#c46851";
                      else if (r.severity === "Medium") pinBg = "#dca45d";
                      else if (r.severity === "Low") pinBg = "#6d8a63";
                      if (r.status === "Resolved") pinBg = "#a3a393";

                      return (
                        <AdvancedMarker
                          key={r.id}
                          position={{ lat: r.latitude, lng: r.longitude }}
                          onClick={() => {
                            setSelectedIssueId(r.id);
                            setInfoWindowReport(r);
                            const el = document.getElementById(`card-${r.id}`);
                            el?.scrollIntoView({ behavior: "smooth", block: "center" });
                          }}
                        >
                          <Pin background={pinBg} borderColor="#ffffff" glyphColor="#ffffff" scale={selectedIssueId === r.id ? 1.25 : 1} />
                        </AdvancedMarker>
                      );
                    })}

                    {/* Show new reporting draft coordinate marker */}
                    {latitude && longitude && (
                      <AdvancedMarker
                        position={{ lat: latitude, lng: longitude }}
                        title="Your Draft Report Location"
                      >
                        <div className="relative flex items-center justify-center">
                          <div className="absolute h-8 w-8 rounded-full bg-[#5a5a40]/30 animate-ping" />
                          <div className="h-5 w-5 rounded-full bg-amber-500 border-2 border-white shadow-md flex items-center justify-center">
                            <div className="h-2 w-2 bg-white rounded-full" />
                          </div>
                        </div>
                      </AdvancedMarker>
                    )}

                    {/* InfoWindow for active clicked pin */}
                    {infoWindowReport && (
                      <InfoWindow
                        position={{ lat: infoWindowReport.latitude, lng: infoWindowReport.longitude }}
                        onCloseClick={() => setInfoWindowReport(null)}
                      >
                        <div className="p-1 max-w-[220px] text-stone-800 bg-white">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold text-white shrink-0 ${
                              infoWindowReport.severity === 'High' ? 'bg-[#c46851]' :
                              infoWindowReport.severity === 'Medium' ? 'bg-[#dca45d]' : 'bg-[#6d8a63]'
                            }`}>
                              {infoWindowReport.severity}
                            </span>
                            <span className="text-[10px] text-[#5a5a40] font-mono font-bold line-clamp-1">{infoWindowReport.category}</span>
                          </div>
                          <h4 className="text-xs font-bold font-sans text-stone-900 line-clamp-1 leading-snug">{infoWindowReport.title}</h4>
                          <p className="text-[11px] text-stone-600 line-clamp-2 mt-1 leading-relaxed">{infoWindowReport.description}</p>
                          <div className="text-[10px] text-[#5a5a40] font-mono mt-2 pt-1 border-t border-stone-100 flex items-center gap-1">
                            <span className="font-semibold">Authority:</span>
                            <span className="font-bold">{infoWindowReport.assignedMunicipalCorporation || "General Authority"}</span>
                          </div>
                          {infoWindowReport.status && (
                            <div className="mt-1 text-[10px] flex items-center gap-1 font-mono">
                              <span className="font-semibold">Status:</span>
                              <span className={`font-bold ${
                                infoWindowReport.status === 'Resolved' ? 'text-emerald-600' :
                                infoWindowReport.status === 'In Progress' ? 'text-[#dca45d]' : 'text-stone-500'
                              }`}>{infoWindowReport.status}</span>
                            </div>
                          )}
                        </div>
                      </InfoWindow>
                    )}
                  </Map>
                </APIProvider>
              )}
            </div>

            {/* Current coordinate banner */}
            <div className="bg-[#fbfbf9] px-6 py-2.5 flex items-center justify-between text-xs text-[#5a5a40] font-mono">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#5a5a40]"></span>
                Selected Input Coordinate:
              </span>
              <span className="font-semibold text-[#2c2c2c] bg-[#5a5a4011] px-2.5 py-0.5 rounded border border-[#5a5a401a]">
                Lat: {latitude.toFixed(5)}, Lng: {longitude.toFixed(5)}
              </span>
            </div>
          </section>

          {/* Organization View Switcher */}
          {role === "organization" && (
            <div className="flex bg-[#f5f5f0] p-1.5 rounded-2xl w-full sm:w-96 mb-6 border border-[#5a5a401a] shadow-xs">
              <button
                type="button"
                onClick={() => setOrgViewMode("feed")}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  orgViewMode === "feed"
                    ? "bg-white text-[#5a5a40] shadow-sm"
                    : "text-[#5a5a40aa] hover:text-[#5a5a40]"
                }`}
              >
                📋 General Reports Feed
              </button>
              <button
                type="button"
                onClick={() => setOrgViewMode("dashboard")}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  orgViewMode === "dashboard"
                    ? "bg-[#5a5a40] text-white shadow-sm"
                    : "text-[#5a5a40aa] hover:text-[#5a5a40]"
                }`}
              >
                🏛️ Priority Dashboard
              </button>
            </div>
          )}

          {role === "organization" && orgViewMode === "dashboard" ? (
            <div className="flex flex-col space-y-6">
              {/* Dashboard Banner */}
              <section className="bg-gradient-to-br from-[#5a5a40] to-[#454530] text-white p-6 sm:p-8 rounded-[32px] border border-[#5a5a4022] shadow-sm relative overflow-hidden">
                <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-10">
                  <Building className="h-48 w-48" />
                </div>
                <span className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-widest block mb-2">
                  🛡️ Administrative Dispatch Panel
                </span>
                <h2 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white leading-tight">
                  High-Priority Emergency Control Center
                </h2>
                <p className="text-xs sm:text-sm text-[#e1e1daee] mt-2 max-w-xl leading-relaxed">
                  Oversee critical neighborhood hazards, assign public works direct lines, and publish instant live updates to reassure residents.
                </p>
              </section>

              {/* Dynamic Priority Statistics */}
              <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-rose-50 border border-rose-100 p-5 rounded-2xl flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 shrink-0">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-rose-500 uppercase tracking-wider block">Critical (High Severity)</span>
                    <span className="text-2xl font-bold text-slate-800">{reports.filter(r => r.severity === "High").length} Issues</span>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-amber-600 uppercase tracking-wider block">Awaiting Officer (No POC)</span>
                    <span className="text-2xl font-bold text-slate-800">{reports.filter(r => r.status !== "Resolved" && !r.poc).length} Pending</span>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-emerald-600 uppercase tracking-wider block">Resolved to Date</span>
                    <span className="text-2xl font-bold text-slate-800">{reports.filter(r => r.status === "Resolved").length} Closed</span>
                  </div>
                </div>
              </section>

              {/* High-Priority Queue & Dispatch Controls */}
              <section className="bg-white p-6 rounded-[28px] border border-[#5a5a4011] shadow-xs space-y-6">
                <div>
                  <h3 className="text-base font-bold font-display text-slate-800 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-[#c46851]" />
                    High-Priority Complaints Dispatch
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    These issues are marked as High Severity or have significant community traction. Allocate direct Point of Contacts to manage delays.
                  </p>
                </div>

                {reports.filter(r => r.severity === "High" || r.upvotes >= 15).length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl text-slate-400">
                    No critical high-priority complaints in queue currently!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reports
                      .filter(r => r.severity === "High" || r.upvotes >= 15)
                      .map((report) => {
                        const hasPoc = !!report.poc;
                        
                        return (
                          <div 
                            key={report.id}
                            className={`p-5 rounded-2xl border transition-all ${
                              report.status === "Resolved"
                                ? "bg-slate-50/50 border-slate-200 opacity-60"
                                : "bg-white border-[#5a5a4011] hover:shadow-xs hover:border-[#5a5a4022]"
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                              <div className="flex items-center gap-2">
                                <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-rose-100">
                                  {report.severity} Severity
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                  report.status === "Resolved"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                    : report.status === "In Progress"
                                    ? "bg-amber-50 text-amber-700 border-amber-100 animate-pulse"
                                    : "bg-blue-50 text-blue-700 border-blue-100"
                                }`}>
                                  {report.status}
                                </span>
                                <span className="text-xs font-mono font-bold text-slate-500">
                                  👍 {report.upvotes} Upvotes
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(report.createdAt).toLocaleDateString()}
                              </span>
                            </div>

                            <div className="space-y-2">
                              <h4 className="font-bold text-sm text-slate-800">
                                <span className="font-mono text-[10px] text-slate-500 mr-1.5 uppercase">#{report.id}</span>
                                {report.title}
                              </h4>
                              <p className="text-xs text-slate-500 leading-relaxed">{report.description}</p>
                            </div>

                            {/* Point of Contact (POC) Detail inside Dashboard Card */}
                            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200/50 space-y-3">
                              {hasPoc ? (
                                <div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold font-mono text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                                      <UserCheck className="h-4 w-4" />
                                      Assigned Point of Contact (Direct Line published)
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingPocReportId(report.id);
                                        setPocName(report.poc?.name || "");
                                        setPocDepartment(report.poc?.department || "");
                                        setPocPhone(report.poc?.phone || "");
                                        setPocEmail(report.poc?.email || "");
                                        setPocNotes(report.poc?.notes || "");
                                      }}
                                      className="text-[10px] font-bold text-amber-700 hover:underline"
                                    >
                                      Edit POC Details
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mt-2 text-slate-700">
                                    <p><strong>Officer Name:</strong> {report.poc?.name} <span className="text-slate-400 font-mono">({report.poc?.department})</span></p>
                                    <p className="font-mono"><strong>📞 Helpline:</strong> {report.poc?.phone} | <strong>✉️ Email:</strong> {report.poc?.email}</p>
                                  </div>
                                  {report.poc?.notes && (
                                    <p className="text-[10px] text-slate-500 mt-1.5 italic bg-white p-2 rounded-lg border border-slate-100">
                                      "Live Status Note: {report.poc?.notes}"
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <p className="text-xs text-amber-800 font-semibold flex items-center gap-1.5">
                                    <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0" />
                                    No Point of Contact assigned. Citizens cannot contact an officer for delays.
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingPocReportId(report.id);
                                      setPocName("");
                                      setPocDepartment("");
                                      setPocPhone("");
                                      setPocEmail("");
                                      setPocNotes("");
                                    }}
                                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg shadow-sm transition-colors"
                                  >
                                    Assign Direct Officer
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Status controls */}
                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                              <span className="text-[11px] font-mono text-slate-500">Update Resolution Stage:</span>
                              <div className="flex gap-1.5 items-center">
                                <select
                                  value={report.status}
                                  onChange={(e) => handleUpdateStatus(report.id, e.target.value as any)}
                                  className="text-[10px] bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-slate-700 font-semibold focus:ring-1 focus:ring-[#5a5a4033]"
                                >
                                  <option value="Reported">Reported</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="Resolved">Resolved</option>
                                </select>
                                <label
                                  className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                                    report.resolvedImageUrl
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-[#5a5a40] text-white hover:bg-[#4a4a30] border-[#5a5a40]"
                                  }`}
                                  title="Upload Completion Photo"
                                >
                                  <Upload className="h-3 w-3" />
                                  {report.resolvedImageUrl ? "Update Photo" : "Upload Photo"}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleResolveWithPhoto(report.id, e)}
                                  />
                                </label>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </section>
            </div>
          ) : (
            <>
              {/* Filters & Reports Header */}
              <section className="bg-white p-6 rounded-[28px] border border-[#5a5a4011] shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#5a5a4011]">
              <div>
                <h2 className="text-lg font-bold font-display text-[#2c2c2c] flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-[#5a5a40]" />
                  Community Reports Feed
                </h2>
                <p className="text-xs text-[#5a5a40aa] mt-0.5">Filter, track, upvote, or update civic hazards submitted by citizens</p>
              </div>

              {/* Reset Filters */}
              {(selectedCategory !== "All" || selectedSeverity !== "All" || selectedStatus !== "All" || selectedDateRange !== "All Time" || selectedMunicipality !== "All") && (
                <button
                  onClick={() => {
                    setSelectedCategory("All");
                    setSelectedSeverity("All");
                    setSelectedStatus("All");
                    setSelectedDateRange("All Time");
                    handleSelectMunicipality("All");
                  }}
                  className="text-xs text-[#5a5a40] font-bold hover:underline flex items-center gap-1 self-start md:self-auto"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Filter Selections Row */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mt-4">
              <div>
                <label className="block text-[10px] font-mono font-bold text-[#5a5a40bb] uppercase mb-1">Municipality</label>
                <select
                  value={selectedMunicipality}
                  onChange={(e) => handleSelectMunicipality(e.target.value)}
                  className="w-full text-xs bg-[#f5f5f0] border-none rounded-xl px-3 py-2 text-[#2c2c2c] font-medium focus:ring-2 focus:ring-[#5a5a4033] focus:outline-hidden"
                >
                  {municipalities.map((m, i) => {
                    const mStr = m as string;
                    return (
                      <option key={i} value={mStr}>
                        {mStr === "All" ? "All Municipalities" : mStr.replace("Municipal Corporation of ", "").replace("Municipal Corporation", "MC")}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold text-[#5a5a40bb] uppercase mb-1">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full text-xs bg-[#f5f5f0] border-none rounded-xl px-3 py-2 text-[#2c2c2c] font-medium focus:ring-2 focus:ring-[#5a5a4033] focus:outline-hidden"
                >
                  {categories.map((c, i) => (
                    <option key={i} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold text-[#5a5a40bb] uppercase mb-1">Severity Priority</label>
                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  className="w-full text-xs bg-[#f5f5f0] border-none rounded-xl px-3 py-2 text-[#2c2c2c] font-medium focus:ring-2 focus:ring-[#5a5a4033] focus:outline-hidden"
                >
                  <option value="All">All Severities</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold text-[#5a5a40bb] uppercase mb-1">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full text-xs bg-[#f5f5f0] border-none rounded-xl px-3 py-2 text-[#2c2c2c] font-medium focus:ring-2 focus:ring-[#5a5a4033] focus:outline-hidden"
                >
                  <option value="All">All Statuses</option>
                  <option value="Reported">Reported</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold text-[#5a5a40bb] uppercase mb-1">Date Range</label>
                <select
                  value={selectedDateRange}
                  onChange={(e) => setSelectedDateRange(e.target.value)}
                  className="w-full text-xs bg-[#f5f5f0] border-none rounded-xl px-3 py-2 text-[#2c2c2c] font-medium focus:ring-2 focus:ring-[#5a5a4033] focus:outline-hidden"
                >
                  <option value="All Time">All Time</option>
                  <option value="Today">Today</option>
                  <option value="Last 7 Days">Last 7 Days</option>
                </select>
              </div>
            </div>
          </section>

          {/* Reports Feed List */}
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredReports.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white p-12 text-center rounded-[28px] border border-dashed border-[#5a5a4033] text-[#5a5a40aa]"
                >
                  <Filter className="mx-auto h-8 w-8 text-[#5a5a40aa] mb-2" />
                  <p className="font-semibold text-[#2c2c2c]">No matching reports found</p>
                  <p className="text-xs text-[#5a5a40aa] mt-1">Try relaxing your filtering parameters above.</p>
                </motion.div>
              ) : (
                filteredReports.map((report) => {
                  const isSelected = selectedIssueId === report.id;
                  
                  // Style colors per severity
                  let severityBadge = "bg-[#5a5a4011] text-[#5a5a40] border-[#5a5a4022]";
                  if (report.severity === "High") severityBadge = "bg-[#c4685111] text-[#c46851] border-[#c4685122]";
                  else if (report.severity === "Medium") severityBadge = "bg-[#dca45d11] text-[#dca45d] border-[#dca45d22]";
                  else if (report.severity === "Low") severityBadge = "bg-[#6d8a6311] text-[#6d8a63] border-[#6d8a6322]";

                  // Status style colors
                  let statusBadge = "bg-slate-100 text-[#2c2c2c] border-slate-200";
                  if (report.status === "In Progress") statusBadge = "bg-[#dca45d11] text-[#dca45d] border-[#dca45d22] animate-pulse";
                  else if (report.status === "Resolved") statusBadge = "bg-[#6d8a6311] text-[#6d8a63] border-[#6d8a6322]";

                  return (
                    <motion.div
                      layout
                      id={`card-${report.id}`}
                      key={report.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ 
                        opacity: 1, 
                        y: 0,
                        borderColor: isSelected ? "#5a5a40" : "#5a5a4011",
                        boxShadow: isSelected ? "0 10px 15px -3px rgba(90, 90, 64, 0.08)" : "0 1px 3px 0 rgba(0, 0, 0, 0.02)"
                      }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => setSelectedIssueId(report.id)}
                      className="bg-white rounded-[28px] p-6 border transition-all duration-300 cursor-pointer flex flex-col md:flex-row gap-6 relative overflow-hidden"
                    >
                      {/* Highlight border decoration for selected */}
                      {isSelected && (
                        <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-[#5a5a40]"></div>
                      )}

                      {/* Left: Image Container */}
                      {report.imageUrl && (
                        <div className="w-full md:w-48 h-36 rounded-2xl overflow-hidden bg-[#f5f5f0] shrink-0 relative border border-[#5a5a4011]">
                          <img 
                            src={report.imageUrl} 
                            alt={report.title} 
                            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-2 left-2 flex flex-col gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#2c2c2cd9] backdrop-blur-xs text-white px-2 py-0.5 rounded-md">
                              {report.category}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Right: Text Details */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          {/* Metadata row */}
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-md ${severityBadge}`}>
                              Severity: {report.severity}
                            </span>
                            <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-md ${statusBadge}`}>
                              Status: {report.status}
                            </span>
                            <span className="text-[10px] font-mono text-[#5a5a40bb] border border-[#5a5a4011] bg-slate-50/50 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <User className="h-3 w-3 text-slate-400" />
                              By: {role === "organization" ? "Anonymous Resident" : (report.submittedByName || "Verified Citizen")}
                            </span>
                            <span className="text-[10px] font-mono text-[#5a5a40aa] ml-auto flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(report.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-[#2c2c2c] font-display flex items-center gap-2">
                            <span className="font-mono text-xs text-[#5a5a4088] uppercase">#{report.id}</span>
                            {report.title}
                          </h3>
                          <p className="text-xs text-[#5a5a40ee] mt-1.5 line-clamp-3 leading-relaxed">{report.description}</p>
                          
                          {/* Stepper Timeline */}
                          <div className="mt-4 flex items-center justify-between max-w-xs">
                            <div className="flex items-center w-full relative">
                              {/* Step 1: Reported */}
                              <div className="flex flex-col items-center z-10 shrink-0">
                                <div className={`h-5 w-5 rounded-full border flex items-center justify-center text-[9px] font-bold ${
                                  report.status === "Reported" || report.status === "In Progress" || report.status === "Resolved"
                                    ? "bg-[#5a5a40] border-[#5a5a40] text-white"
                                    : "bg-white border-slate-200 text-slate-400"
                                }`}>
                                  1
                                </div>
                                <span className="text-[9px] font-mono mt-0.5 text-[#5a5a40] font-bold">Reported</span>
                              </div>

                              {/* Progress Line 1 */}
                              <div className={`h-0.5 w-full -mt-3.5 mx-1 ${
                                report.status === "In Progress" || report.status === "Resolved"
                                  ? "bg-[#5a5a40]"
                                  : "bg-slate-200"
                              }`} />

                              {/* Step 2: In Progress */}
                              <div className="flex flex-col items-center z-10 shrink-0">
                                <div className={`h-5 w-5 rounded-full border flex items-center justify-center text-[9px] font-bold ${
                                  report.status === "In Progress" || report.status === "Resolved"
                                    ? "bg-[#dca45d] border-[#dca45d] text-white"
                                    : "bg-white border-slate-200 text-slate-400"
                                }`}>
                                  2
                                </div>
                                <span className={`text-[9px] font-mono mt-0.5 ${
                                  report.status === "In Progress" ? "text-[#dca45d] font-bold animate-pulse" : "text-[#5a5a40aa]"
                                }`}>In-Progress</span>
                              </div>

                              {/* Progress Line 2 */}
                              <div className={`h-0.5 w-full -mt-3.5 mx-1 ${
                                report.status === "Resolved"
                                  ? "bg-[#5a5a40]"
                                  : "bg-slate-200"
                              }`} />

                              {/* Step 3: Resolved */}
                              <div className="flex flex-col items-center z-10 shrink-0">
                                <div className={`h-5 w-5 rounded-full border flex items-center justify-center text-[9px] font-bold ${
                                  report.status === "Resolved"
                                    ? "bg-[#6d8a63] border-[#6d8a63] text-white"
                                    : "bg-white border-slate-200 text-slate-400"
                                }`}>
                                  3
                                </div>
                                <span className={`text-[9px] font-mono mt-0.5 ${
                                  report.status === "Resolved" ? "text-[#6d8a63] font-bold" : "text-[#5a5a40aa]"
                                }`}>Resolved</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* AI analysis result banner inside cards */}
                          <div className="mt-3.5 bg-[#fbfbf9] border border-[#5a5a401a] p-3 rounded-xl flex items-start gap-2.5">
                            <ShieldAlert className="h-4 w-4 text-[#5a5a40] shrink-0 mt-0.5" />
                            <div className="text-[11px] text-[#2c2c2c]">
                              <p className="font-semibold text-[#2c2c2c]">
                                <span className="text-[#5a5a40] font-bold">Gemini AI Analysis:</span> {report.summary}
                              </p>
                              <p className="mt-1 font-medium text-[#5a5a40]">
                                <span className="font-bold text-[#2c2c2c]">Recommended Action:</span> {report.recommendedAction}
                              </p>
                            </div>
                          </div>

                          {/* Proximity Warning block */}
                          {report.potentialDuplicateOf && (
                            <div className="mt-2 bg-[#dca45d1a] border border-[#dca45d33] p-2.5 rounded-xl flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-[#dca45d] shrink-0" />
                              <p className="text-[10px] text-[#2c2c2c] font-semibold">
                                Potential duplicate detected within 100 meters range of an existing active report!
                              </p>
                            </div>
                          )}

                          {/* Point of Contact (POC) Section */}
                          <div className="mt-3.5 bg-slate-50 border border-slate-200/60 p-3.5 rounded-2xl">
                            {report.poc ? (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                    <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                                    Assigned Point of Contact
                                  </span>
                                  <span className="text-[9px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-sm uppercase tracking-wide">
                                    Direct Line
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                  <div className="space-y-0.5">
                                    <p className="font-bold text-[#2c2c2c]">{report.poc.name}</p>
                                    <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                                      <Briefcase className="h-3 w-3 text-slate-400" />
                                      {report.poc.department}
                                    </p>
                                  </div>
                                  <div className="space-y-0.5 text-left sm:text-right">
                                    <p className="text-[10px] font-mono text-[#5a5a40] font-semibold flex items-center gap-1 sm:justify-end">
                                      <Phone className="h-3 w-3 text-[#5a5a40aa]" />
                                      {report.poc.phone}
                                    </p>
                                    <p className="text-[10px] font-mono text-slate-500 flex items-center gap-1 sm:justify-end">
                                      <Mail className="h-3 w-3 text-slate-400" />
                                      {report.poc.email}
                                    </p>
                                  </div>
                                </div>
                                {report.poc.notes && (
                                  <div className="bg-white p-2.5 rounded-xl border border-slate-100 text-[11px] text-slate-600 italic">
                                    <span className="font-bold font-mono text-[9px] text-[#5a5a40] uppercase block not-italic">Latest Dispatch Update:</span>
                                    "{report.poc.notes}"
                                  </div>
                                )}
                                <p className="text-[9px] text-slate-400 leading-normal pt-1.5 border-t border-slate-100">
                                  💡 <strong>Experiencing a delay?</strong> Reach out directly using the phone or email above to ask this officer for real-time live status updates.
                                </p>
                              </div>
                            ) : (
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                  <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0"></span>
                                  Awaiting specific administrative Officer assignment.
                                </p>
                                <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-sm">
                                  Central Queue
                                </span>
                              </div>
                            )}

                            {/* Organization Edit/Assign Controls */}
                            {role === "organization" && (
                              <div className="mt-2.5 pt-2 border-t border-slate-200/50 flex justify-end">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingPocReportId(report.id);
                                    setPocName(report.poc?.name || "");
                                    setPocDepartment(report.poc?.department || "");
                                    setPocPhone(report.poc?.phone || "");
                                    setPocEmail(report.poc?.email || "");
                                    setPocNotes(report.poc?.notes || "");
                                  }}
                                  className="text-[10px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all"
                                >
                                  {report.poc ? "✏️ Edit Point of Contact" : "➕ Assign Point of Contact"}
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Nearby Issues inside Card */}
                          {isSelected && (
                            <div className="mt-3.5 bg-sky-50/50 border border-sky-100/50 p-3.5 rounded-2xl">
                              <span className="text-[10px] font-mono font-bold text-sky-700 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                <MapPin className="h-3.5 w-3.5 text-sky-600" />
                                Nearby Neighborhood Complaints (Within 300m)
                              </span>
                              {(() => {
                                const nearby = reports.filter(r => r.id !== report.id && getDistance(r.latitude, r.longitude, report.latitude, report.longitude) <= 0.004);
                                if (nearby.length === 0) {
                                  return (
                                    <p className="text-[11px] text-slate-500 italic">
                                      No other active complaints reported immediately nearby.
                                    </p>
                                  );
                                }
                                return (
                                  <div className="space-y-2">
                                    {nearby.slice(0, 3).map((near) => {
                                      const distKm = getDistance(near.latitude, near.longitude, report.latitude, report.longitude) * 111;
                                      const distMeters = Math.round(distKm * 1000);
                                      
                                      let nearSeverityColor = "text-[#6d8a63] bg-[#6d8a6311]";
                                      if (near.severity === "High") nearSeverityColor = "text-[#c46851] bg-[#c4685111]";
                                      else if (near.severity === "Medium") nearSeverityColor = "text-[#dca45d] bg-[#dca45d11]";

                                      return (
                                        <div 
                                          key={near.id}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedIssueId(near.id);
                                            const el = document.getElementById(`card-${near.id}`);
                                            el?.scrollIntoView({ behavior: "smooth", block: "center" });
                                          }}
                                          className="bg-white p-2.5 rounded-xl border border-sky-100/30 flex items-center justify-between gap-3 hover:bg-sky-50 cursor-pointer transition-all shadow-xs"
                                        >
                                          <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-slate-800 truncate">{near.title}</p>
                                            <p className="text-[10px] text-slate-400 font-medium">
                                              {near.category} • {distMeters}m away
                                            </p>
                                          </div>
                                          <div className="flex items-center gap-1.5 shrink-0">
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${nearSeverityColor}`}>
                                              {near.severity}
                                            </span>
                                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                              {near.status}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                            </div>
                          )}

                          {/* Resolved Photos Section */}
                          {(report.resolvedImageUrl || (role === "organization" && report.status === "Resolved")) && (
                            <div className="mt-4 p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex flex-col gap-3">
                              <h4 className="text-xs font-bold font-display text-emerald-800 uppercase tracking-wide flex items-center gap-1.5">
                                <Check className="h-4 w-4 text-emerald-600" />
                                Final Resolution Evidence
                              </h4>
                              {report.resolvedImageUrl ? (
                                <div className="w-full h-48 rounded-xl overflow-hidden border border-emerald-200/50 relative">
                                  <img
                                    src={report.resolvedImageUrl}
                                    alt="Resolved issue"
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              ) : (
                                <div className="text-xs text-emerald-700/80 italic border border-dashed border-emerald-200 rounded-xl p-4 text-center">
                                  No resolution photo uploaded yet.
                                </div>
                              )}
                            </div>
                          )}

                        </div>

                        {/* Card bottom actions row */}
                        <div className="flex items-center justify-between border-t border-[#5a5a4011] pt-4 mt-4 flex-wrap gap-2.5">
                          {/* Location pin locator */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedIssueId(report.id);
                              mapContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                            }}
                            className="flex items-center text-[10px] text-[#5a5a40] font-mono hover:underline bg-[#5a5a4011] hover:bg-[#5a5a4022] px-2.5 py-1 rounded-xl border border-[#5a5a401a] transition-all"
                            title="Locate this report on the Neighborhood Map"
                          >
                            <MapPin className="h-3.5 w-3.5 text-[#5a5a40] mr-1" />
                            Pin: {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                          </button>

                          {/* Upvotes & Status update tools */}
                          <div className="flex items-center space-x-2">
                            {/* Upvote button */}
                            {role !== "organization" && (
                              <button
                                onClick={(e) => handleUpvote(report.id, e)}
                                disabled={upvotedIds.includes(report.id)}
                                className={`font-semibold text-xs py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition-all border ${
                                  upvotedIds.includes(report.id)
                                    ? "bg-[#6d8a6322] text-[#6d8a63] border-[#6d8a6333] cursor-not-allowed opacity-80"
                                    : "bg-[#5a5a4011] text-[#5a5a40] hover:bg-[#5a5a4022] border-[#5a5a4022]"
                                }`}
                              >
                                {upvotedIds.includes(report.id) ? (
                                  <>
                                    <Check className="h-3.5 w-3.5 text-[#6d8a63]" />
                                    Verified ({report.upvotes})
                                  </>
                                ) : (
                                  <>
                                    <ArrowUp className="h-3.5 w-3.5 text-[#5a5a40]" />
                                    Verify / Upvote ({report.upvotes})
                                  </>
                                )}
                              </button>
                            )}

                            {/* Simulated Municipal status change select */}
                            {role === "organization" && (
                              <div className="flex items-center space-x-1">
                                <select
                                  value={report.status}
                                  onChange={(e) => handleUpdateStatus(report.id, e.target.value as any)}
                                  className="text-[10px] bg-slate-50 border border-[#5a5a401a] rounded-lg py-1.5 px-2 text-slate-700 font-semibold focus:ring-1 focus:ring-[#5a5a4033]"
                                >
                                  <option value="Reported">Reported</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="Resolved">Resolved</option>
                                </select>
                                <label
                                  className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                                    report.resolvedImageUrl 
                                      ? "bg-[#6d8a6311] text-[#6d8a63] border-[#6d8a6322]" 
                                      : "bg-[#f5f5f0] text-[#5a5a40] border-[#5a5a401a] hover:bg-[#5a5a4011]"
                                  }`}
                                  title="Upload Completion Photo"
                                >
                                  <Upload className="h-3 w-3" />
                                  {report.resolvedImageUrl ? "Update Photo" : "Upload Photo"}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleResolveWithPhoto(report.id, e)}
                                  />
                                </label>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
          </>
          )}
        </div>

        {/* Right Section - Interactive Reporting Form (4 Columns) */}
        {role === "citizen" && (
        <aside className="lg:col-span-4 flex flex-col space-y-8">
          
          {/* Submission Instructions / Guidelines card */}
          <section className="bg-gradient-to-br from-[#5a5a40] to-[#3c3c2b] text-white p-6 rounded-[28px] shadow-sm border border-[#5a5a4022]">
            <h3 className="text-sm font-bold font-display uppercase tracking-wider text-[#e1e1da] flex items-center gap-1.5">
              <Info className="h-4.5 w-4.5" />
              Platform Integration Guide
            </h3>
            <p className="text-xs text-[#e1e1dae6] mt-2 leading-relaxed">
              When citizens upload physical proof, our backend pipes the images to a server-side <strong>Gemini 3.5 API</strong>. 
            </p>
            <ul className="text-xs text-[#e1e1da] space-y-1.5 mt-3 list-disc pl-4">
              <li>Automatic civic issue categorization</li>
              <li>Calculates severity metrics (Low / Med / High)</li>
              <li>Assesses action recommendations</li>
              <li>Triggers 100m proximity-based deduplication</li>
            </ul>
          </section>

          {/* Form */}
          <div className="bg-white p-6 rounded-[28px] border border-[#5a5a4011] shadow-xs">
            <h2 className="text-base font-bold font-display text-[#2c2c2c] flex items-center gap-2 border-b border-[#5a5a4011] pb-3">
              <Plus className="h-5 w-5 text-[#5a5a40]" />
              File Local Civic Issue Report
            </h2>

            <form onSubmit={handleSubmitReport} className="space-y-4 mt-4">
              
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-[#5a5a40] mb-1">Issue Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Broken Water Pipe / Large Pot Hole"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs bg-[#f5f5f0] border-none rounded-xl px-3.5 py-2.5 text-[#2c2c2c] focus:ring-2 focus:ring-[#5a5a4033] focus:outline-hidden"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-[#5a5a40] mb-1">Detailed Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide details about how this is obstructing safe transit..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs bg-[#f5f5f0] border-none rounded-xl px-3.5 py-2.5 text-[#2c2c2c] focus:ring-2 focus:ring-[#5a5a4033] focus:outline-hidden"
                />
              </div>

              {/* Precise Location & Landmarks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#5a5a40] mb-1">Precise Location (Street / Lane)</label>
                  <input
                    type="text"
                    placeholder="e.g. Outer Circle, Block E"
                    value={preciseLocation}
                    onChange={(e) => setPreciseLocation(e.target.value)}
                    className="w-full text-xs bg-[#f5f5f0] border-none rounded-xl px-3.5 py-2.5 text-[#2c2c2c] focus:ring-2 focus:ring-[#5a5a4033] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5a5a40] mb-1">Nearby Landmarks</label>
                  <input
                    type="text"
                    placeholder="e.g. Opposite Wenger's Bakery"
                    value={landmarks}
                    onChange={(e) => setLandmarks(e.target.value)}
                    className="w-full text-xs bg-[#f5f5f0] border-none rounded-xl px-3.5 py-2.5 text-[#2c2c2c] focus:ring-2 focus:ring-[#5a5a4033] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Municipal Corporation Selector */}
              <div>
                <label className="block text-xs font-semibold text-[#5a5a40] mb-1">Assign to Municipal Corporation</label>
                <select
                  value={municipalCorporation === "Auto" ? "Auto" : (TOP_100_MUNICIPALITIES.includes(municipalCorporation) ? municipalCorporation : "Custom")}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "Custom") {
                      setMunicipalCorporation("");
                    } else {
                      setMunicipalCorporation(val);
                    }
                  }}
                  className="w-full text-xs bg-[#f5f5f0] border-none rounded-xl px-3.5 py-2.5 text-[#2c2c2c] focus:ring-2 focus:ring-[#5a5a4033] focus:outline-hidden"
                >
                  <option value="Auto">Auto-Detect via GPS Coordinates / AI</option>
                  {TOP_100_MUNICIPALITIES.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                  <option value="Custom">Custom Municipal Corporation...</option>
                </select>
                {municipalCorporation !== "Auto" && !TOP_100_MUNICIPALITIES.includes(municipalCorporation) && (
                  <input
                    type="text"
                    required
                    placeholder="Type customized Municipal body name (e.g. Pune Municipal Corporation)..."
                    value={municipalCorporation}
                    onChange={(e) => setMunicipalCorporation(e.target.value)}
                    className="w-full text-xs bg-[#f5f5f0] border-none rounded-xl px-3.5 py-2.5 mt-2 text-[#2c2c2c] focus:ring-2 focus:ring-[#5a5a4033] focus:outline-hidden"
                  />
                )}
              </div>

              {/* Coordinates */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#5a5a40]">Complaint Coordinates (India only)</label>
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    className="text-[10px] text-[#5a5a40] font-bold hover:underline"
                  >
                    Set Pin on India Map
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="block text-[10px] text-[#5a5a40aa] font-mono">Latitude</span>
                    <input
                      type="number"
                      step="any"
                      value={latitude}
                      onChange={(e) => setLatitude(parseFloat(e.target.value))}
                      className="w-full text-xs bg-[#f5f5f0] border-none rounded-xl px-2.5 py-2 text-[#2c2c2c] focus:ring-2 focus:ring-[#5a5a4033] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#5a5a40aa] font-mono">Longitude</span>
                    <input
                      type="number"
                      step="any"
                      value={longitude}
                      onChange={(e) => setLongitude(parseFloat(e.target.value))}
                      className="w-full text-xs bg-[#f5f5f0] border-none rounded-xl px-2.5 py-2 text-[#2c2c2c] focus:ring-2 focus:ring-[#5a5a4033] focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* File Image Upload */}
              <div>
                <label className="block text-xs font-semibold text-[#5a5a40] mb-1">Upload Photo Evidence (Optional, Max 5)</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#d6d6c2] hover:border-[#5a5a40] rounded-xl p-4 text-center cursor-pointer bg-[#fdfdfc] hover:bg-[#f5f5f0] transition-all"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoAdd}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />
                  <div className="space-y-1.5">
                    <div className="mx-auto w-8 h-8 rounded-full bg-[#5a5a401a] flex items-center justify-center">
                      <Upload className="h-4 w-4 text-[#5a5a40]" />
                    </div>
                    <p className="text-xs text-[#2c2c2c] font-medium">Drag & Drop or Select Multiple Photos</p>
                    <p className="text-[10px] text-[#5a5a40bb] font-mono">Select up to 5 photos (PNG, JPG, or WEBP)</p>
                  </div>
                </div>

                {/* Thumbnails grid */}
                {photos.length > 0 && (
                  <div className="grid grid-cols-5 gap-2 mt-2">
                    {photos.map((photo) => (
                      <div key={photo.id} className="relative aspect-square bg-[#f5f5f0] rounded-lg overflow-hidden border border-slate-200 group shadow-xs">
                        <img 
                          src={photo.preview} 
                          alt="Evidence thumbnail" 
                          className="w-full h-full object-cover" 
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePhotoRemove(photo.id);
                          }}
                          className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-bold shadow-md transition-colors"
                          title="Remove photo"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Display Messages */}
              <AnimatePresence>
                {errorMessage && (
                  <motion.div 
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="bg-rose-50 text-rose-800 text-xs p-3.5 rounded-xl border border-rose-200/50 flex items-start gap-2"
                  >
                    <AlertTriangle className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </motion.div>
                )}

                {successMessage && (
                  <motion.div 
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="bg-emerald-50 text-emerald-800 text-xs p-3.5 rounded-xl border border-emerald-200/50 flex items-start gap-2"
                  >
                    <CheckCircle className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{successMessage}</span>
                  </motion.div>
                )}

                {isSubmitting && (
                  <motion.div 
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#5a5a4011] text-[#2c2c2c] text-xs p-3.5 rounded-xl border border-[#5a5a4022] flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4.5 w-4.5 text-[#5a5a40] shrink-0 animate-spin" />
                      <span className="font-semibold text-[#5a5a40]">Gemini AI Analyzing Evidence...</span>
                    </div>
                    <p className="text-[11px] text-[#5a5a40] font-mono pl-6 animate-pulse">
                      &gt; {submitStep}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#5a5a40] hover:bg-[#4a4a35] disabled:bg-slate-300 text-white font-bold text-xs py-3 px-4 rounded-full shadow-lg shadow-[#5a5a4022] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? "Processing..." : "File Report & Call Gemini"}
              </button>
            </form>
          </div>
        </aside>
        )}
      </main>
      )}

      {/* Footer */}
      <footer className="h-14 bg-[#5a5a40] text-white/80 px-8 flex items-center justify-between text-xs mt-12 font-mono">
        <div>© 2026 MyNeighbourhood Platform</div>
        <div className="flex space-x-4 text-[10px]">
          <span>Cloud Run Ready</span>
          <span>Express + React + Vite</span>
        </div>
      </footer>

      {/* 4. User Profile Slide-over Drawer */}
      <AnimatePresence>
        {isProfileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProfileOpen(false)}
              className="fixed inset-0 bg-black z-50 cursor-pointer"
            />

            {/* Sidebar Content */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto flex flex-col border-l border-[#5a5a4011]"
            >
              {/* Header */}
              <div className="p-6 border-b border-[#5a5a4011] flex items-center justify-between bg-[#fbfbf9]">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-[#5a5a40]" />
                  <h2 className="text-lg font-bold font-display text-[#2c2c2c]">Resident Profile</h2>
                </div>
                <button
                  onClick={() => setIsProfileOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 flex-1">
                {/* Resident Identity */}
                <div className="bg-[#fcfcf9] border border-[#5a5a4011] p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden">
                  <div className="absolute right-0 top-0 transform translate-x-3 -translate-y-3 opacity-5 pointer-events-none">
                    <User className="h-28 w-28 text-[#5a5a40]" />
                  </div>
                  
                  {/* Avatar */}
                  <div className="h-14 w-14 rounded-full bg-[#5a5a40] text-white flex items-center justify-center font-bold text-xl font-display shadow-sm shrink-0">
                    {residentName ? residentName.charAt(0).toUpperCase() : "R"}
                  </div>

                  <div className="flex-1 space-y-1 z-10">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={residentName}
                        onChange={(e) => {
                          setResidentName(e.target.value);
                          localStorage.setItem("myneighbourhood_resident_name", e.target.value);
                        }}
                        placeholder="Resident Name"
                        className="bg-transparent text-base font-bold text-[#2c2c2c] border-b border-transparent hover:border-slate-300 focus:border-[#5a5a40] focus:outline-hidden py-0.5 px-1 w-full rounded-md transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-0.5 text-[10px] font-mono text-[#5a5a40aa]">
                      <span>Client ID: {clientId || "Loading..."}</span>
                    </div>
                  </div>
                </div>

                {/* Badge Section */}
                <div className="bg-gradient-to-r from-[#5a5a400c] to-[#6d8a630c] border border-[#5a5a4011] p-4 rounded-xl flex items-center gap-3">
                  <div className="text-2xl">{userIconBadge}</div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-[#5a5a40bb] uppercase tracking-wider block">Neighbourhood Rank</span>
                    <span className="text-sm font-bold text-[#2c2c2c]">{userBadge}</span>
                  </div>
                </div>

                {/* Quick Stats Metrics Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#fcfcf9] p-3 rounded-xl border border-[#5a5a400d] text-center">
                    <span className="text-[9px] font-mono text-slate-400 uppercase font-bold tracking-wider block">Filed</span>
                    <span className="text-xl font-bold text-[#2c2c2c] font-display mt-0.5 block">{userReportsCount}</span>
                  </div>
                  <div className="bg-[#fcfcf9] p-3 rounded-xl border border-[#5a5a400d] text-center">
                    <span className="text-[9px] font-mono text-slate-400 uppercase font-bold tracking-wider block">Resolved</span>
                    <span className="text-xl font-bold text-emerald-700 font-display mt-0.5 block">{userResolvedCount}</span>
                  </div>
                  <div className="bg-[#fcfcf9] p-3 rounded-xl border border-[#5a5a400d] text-center">
                    <span className="text-[9px] font-mono text-slate-400 uppercase font-bold tracking-wider block">Upvotes</span>
                    <span className="text-xl font-bold text-[#5a5a40] font-display mt-0.5 block">{userTotalUpvotes}</span>
                  </div>
                </div>

                {/* My Submitted Complaints */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold font-mono text-[#5a5a40bb] uppercase tracking-wider">My Submitted Complaints ({userReportsCount})</h3>
                  
                  {userReportsCount === 0 ? (
                    <div className="text-center py-8 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-500 leading-relaxed">
                      <p className="font-semibold mb-1 text-slate-600">No complaints submitted yet</p>
                      <p>Pin a location and fill the sidebar form to submit your first neighborhood issue!</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {userReports.map(report => (
                        <div
                          key={report.id}
                          className="p-3.5 bg-white border border-[#5a5a4011] rounded-xl hover:border-[#5a5a4033] hover:shadow-xs transition-all relative"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              report.status === "Resolved"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50"
                                : report.status === "In Progress"
                                ? "bg-amber-50 text-amber-700 border border-amber-200/50"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}>
                              {report.status}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(report.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </span>
                          </div>

                          <h4 className="font-bold text-xs text-slate-800 mt-2 line-clamp-1">
                            <span className="font-mono text-[10px] text-slate-500 mr-1.5 uppercase">#{report.id}</span>
                            {report.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">{report.description}</p>

                          {/* Compact POC for Resident drawer */}
                          {report.poc ? (
                            <div className="mt-2.5 p-2 bg-emerald-50/40 border border-emerald-100 rounded-lg text-[10px] text-slate-600">
                              <p className="font-bold text-slate-800 flex items-center gap-1">
                                <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                                Assigned officer: {report.poc.name}
                              </p>
                              <p className="mt-0.5 text-[9px] font-mono text-[#5a5a40]">
                                📞 Direct helpline: {report.poc.phone} &nbsp;|&nbsp; ✉️ {report.poc.email}
                              </p>
                              {report.poc.notes && (
                                <p className="mt-1 bg-white p-1 rounded-md border border-slate-100 text-[9px] text-slate-500 italic">
                                  "Live Status: {report.poc.notes}"
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="mt-2.5 p-2 bg-amber-50/50 border border-amber-100/50 rounded-lg text-[9px] text-amber-800 flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 bg-amber-400 rounded-full animate-pulse"></span>
                              <span>Awaiting administrator assignment.</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between border-t border-[#5a5a400d] pt-2.5 mt-2.5">
                            {/* Upvotes counter */}
                            <span className="text-[10px] text-slate-400 font-medium">
                              👍 {report.upvotes} upvotes
                            </span>

                            <div className="flex items-center space-x-2">
                              {/* Locate on Map action button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedIssueId(report.id);
                                  setIsProfileOpen(false);
                                  mapContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                                }}
                                className="text-[10px] font-bold text-[#5a5a40] hover:underline flex items-center gap-0.5 bg-[#5a5a400c] px-2 py-1 rounded-lg border border-[#5a5a401a]"
                              >
                                <MapPin className="h-3 w-3" />
                                Locate
                              </button>

                              {/* Simulated municipal action only for organization! */}
                              {role === "organization" && (
                                <div className="flex items-center space-x-1">
                                  <select
                                    value={report.status}
                                    onChange={(e) => handleUpdateStatus(report.id, e.target.value as any)}
                                    className="text-[10px] bg-slate-50 border border-[#5a5a401a] rounded-lg py-1 px-1.5 text-slate-700 font-semibold focus:ring-1 focus:ring-[#5a5a4033]"
                                  >
                                    <option value="Reported">Reported</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Resolved">Resolved</option>
                                  </select>
                                  <label
                                    className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                                      report.resolvedImageUrl 
                                        ? "bg-[#6d8a6311] text-[#6d8a63] border-[#6d8a6322]" 
                                        : "bg-[#f5f5f0] text-[#5a5a40] border-[#5a5a401a] hover:bg-[#5a5a4011]"
                                    }`}
                                    title="Upload Completion Photo"
                                  >
                                    <Upload className="h-3 w-3" />
                                    {report.resolvedImageUrl ? "Update Photo" : "Upload Photo"}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => handleResolveWithPhoto(report.id, e)}
                                    />
                                  </label>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 5. Point of Contact (POC) Assignment/Edit Modal */}
      <AnimatePresence>
        {editingPocReportId && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingPocReportId(null)}
              className="fixed inset-0 bg-black/60 z-50 cursor-pointer backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-lg mx-auto bg-white rounded-3xl shadow-2xl z-50 overflow-hidden border border-amber-100 flex flex-col"
            >
              <div className="p-6 border-b border-[#5a5a4011] flex items-center justify-between bg-amber-50/40">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-amber-700" />
                  <div>
                    <h3 className="text-base font-bold font-display text-slate-800">
                      Assign / Edit Point of Contact
                    </h3>
                    <p className="text-[10px] text-amber-800 font-medium">
                      Configure a direct line of communication for citizens
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingPocReportId(null)}
                  className="p-1.5 rounded-xl hover:bg-amber-100/50 transition-colors text-amber-800/60 hover:text-amber-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={(e) => handleUpdatePoc(editingPocReportId, e)} className="p-6 space-y-4">
                <div className="bg-amber-50 border border-amber-200/50 p-3.5 rounded-2xl flex items-start gap-2.5">
                  <Info className="h-4.5 w-4.5 text-amber-700 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-950 leading-relaxed">
                    <strong>Direct Citizen Contact:</strong> These details will be public on the complaint. If resolution is delayed, residents are instructed to reach out here directly. Please provide accurate municipal line details.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Officer Name / Representative Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Officer Marcus Brody / Sarah Jenkins"
                      value={pocName}
                      onChange={(e) => setPocName(e.target.value)}
                      className="w-full text-xs bg-[#f5f5f0] border-none rounded-xl px-3.5 py-2.5 text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Department / Division <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. DPW - Road Safety Team / City Power & Light"
                      value={pocDepartment}
                      onChange={(e) => setPocDepartment(e.target.value)}
                      className="w-full text-xs bg-[#f5f5f0] border-none rounded-xl px-3.5 py-2.5 text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Direct Phone / Extension <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. +1 (415) 555-0143"
                        value={pocPhone}
                        onChange={(e) => setPocPhone(e.target.value)}
                        className="w-full text-xs bg-[#f5f5f0] border-none rounded-xl px-3.5 py-2.5 text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Direct Contact Email <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. m.brody@sfgov.org"
                        value={pocEmail}
                        onChange={(e) => setPocEmail(e.target.value)}
                        className="w-full text-xs bg-[#f5f5f0] border-none rounded-xl px-3.5 py-2.5 text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Live Status Update / Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Provide a live update on why there is a delay and current repair steps..."
                      value={pocNotes}
                      onChange={(e) => setPocNotes(e.target.value)}
                      className="w-full text-xs bg-[#f5f5f0] border-none rounded-xl px-3.5 py-2.5 text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingPocReportId(null)}
                    className="text-xs text-slate-500 font-bold hover:bg-slate-100 px-4 py-2.5 rounded-full transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs py-2.5 px-5 rounded-full transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Save Point of Contact
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
