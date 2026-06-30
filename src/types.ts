export interface PointOfContact {
  name: string;
  department: string;
  phone: string;
  email: string;
  notes?: string;
}

export interface CivicIssue {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
  imageUrls?: string[]; // Multiple photos
  resolvedImageUrl?: string;
  resolvedImageUrls?: string[];
  preciseLocation?: string; // Specific address / street info
  landmarks?: string; // Nearby landmarks
  category: string;
  severity: 'Low' | 'Medium' | 'High';
  summary: string;
  recommendedAction: string;
  upvotes: number;
  status: 'Reported' | 'In Progress' | 'Resolved';
  createdAt: string;
  potentialDuplicateOf?: string; // ID of the issue this is close to
  upvotedBy?: string[];
  submittedBy?: string;
  submittedByName?: string;
  poc?: PointOfContact;
  assignedMunicipalCorporation?: string; // Assigned municipal body
}

export interface ReportSubmitRequest {
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  image?: {
    data: string; // base64 string
    mimeType: string;
  };
  images?: {
    data: string; // base64 string
    mimeType: string;
  }[]; // Support multiple photos
  preciseLocation?: string;
  landmarks?: string;
  municipalCorporation?: string;
  clientId?: string;
  submittedByName?: string;
}
