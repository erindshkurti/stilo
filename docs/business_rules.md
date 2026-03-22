# Stilo Business Rules & Logic

This document defines the core operational rules, user permissions, and logic of the Stilo platform.

---

## 1. User Roles & Permissions

Stilo supports three primary user roles, each with a distinct workspace and set of capabilities.

### **A. Customer**
*   **Purpose**: Browsing and booking appointments.
*   **Landing Page**: `/bookings` (List of their upcoming/past appointments).
*   **Capabilities**:
    *   Search for businesses by location, service, and date.
    *   Book services with specific stylists or "any available."
    *   Manage personal profile (Name, Phone, Avatar).
    *   View booking history and status.

### **B. Business Owner**
*   **Purpose**: Managing a shop, staff, and overall business operations.
*   **Landing Page**: `/business/dashboard` (Performance stats and daily overview).
*   **Capabilities**:
    *   **Master Calendar**: View/Edit all stylist schedules in a single grid.
    *   **Team Management**: Add/Remove stylists by email.
    *   **Service Management**: Define service catalog, prices, and durations.
    *   **Onboarding**: Create and verify a physical business profile.

### **C. Stylist / Staff**
*   **Purpose**: Managing personal schedules and individual client queues.
*   **Landing Page**: `/stylist/dashboard` (Personal calendar and upcoming tasks).
*   **Capabilities**:
    *   **Personal Schedule**: Set individual working hours that override business defaults.
    *   **Time Off**: Create specific "Time Blocks" (e.g., lunch, personal) to prevent bookings.
    *   **Status Management**: Mark their own appointments as Checked-In, Completed, or Cancelled.

---

## 2. Authentication & Navigation Logic

Stilo uses a "Common Sense" redirection system to ensure users land where they are most productive.

### **Sign-In Redirection Rules**
Upon successful authentication, the system determines the destination based on the following priority:
1.  **Deep-Links**: Specific return URLs (e.g., a direct booking link or settings page) are respected.
2.  **Role-Based Home**:
    *   `business_owner` -> `/business/dashboard`
    *   `stylist` -> `/stylist/dashboard`
    *   `customer` -> `/bookings`
3.  **The "Profile Override"**: If a professional (Owner/Stylist) tries to access the generic `/profile` page, they are automatically diverted to their respective professional dashboard.

### **Stylist Onboarding Flow (Invitation Consent)**
To prevent accounts from being linked without user knowledge, Stilo uses a formal acceptance flow:
1.  **Invite Creation**: An Owner adds a stylist by email in the Team settings.
2.  **Detection**: When that user signs in, the app detects the pending invitation via a cross-business "Collection Group" query.
3.  **Prompt**: The user is redirected to `/stylist/invite`, where they see the business details and must explicitly click **"Accept Invitation."**
4.  **Verification**: Only after acceptance is the `user_type` in the profile updated to `stylist`.

---

## 3. Scheduling & Availability Engine

The core booking logic is hierarchical, ensuring that staff preferences override business-wide defaults.

### **Availability Priority (Tiered)**
When calculating open time slots for a stylist:
1.  **Time Blocks** (Highest Priority): If a stylist adds a "Personal Block," that slot is unconditionally closed.
2.  **Existing Bookings**: Slots already occupied by confirmed appointments are closed.
3.  **Stylist Hours** (Override): If a stylist has set personal working hours (e.g., 10 AM - 4 PM), these are used.
4.  **Business Hours** (Default): If no stylist-specific hours exist, the business's general hours are used.

### **Booking States**
*   **Pending**: Initial state after a client books.
*   **Checked-In**: Used when the client arrives at the shop.
*   **Completed**: Triggers the end of the appointment.
*   **Cancelled**: Frees up the time slot immediately across all calendars.

---

## 4. Search & Discovery Logic

*   **Autocomplete Suggestions**: The landing page uses a debounced (300ms) logic to fetch location and service suggestions from the database.
*   **Location Strategy**: Businesses are indexed by "City." Search results are primarily filtered by city matching the user's location input.
*   **Featured Priority**: The home page prioritizes businesses with the `is_featured: true` flag, limited to the top 4 results.

---

## 5. Business Onboarding & Media

### **Onboarding Wizard**
New businesses undergo a 5-step verification process before being listed:
1.  **Details**: Name, description, and primary category.
2.  **Location**: Physical address and city indexing.
3.  **Hours**: Weekly schedule definition (serialized as JSON).
4.  **Team**: Initial staff invitation by email.
5.  **Services**: Initial catalog creation (Price, Duration).

### **Media Handling (Portfolio)**
*   **Storage**: All images (Avatars and Portfolio) are stored in Firebase Storage buckets.
*   **Portfolio Rules**: Businesses can upload multiple images to a dedicated subcollection.
*   **Featured Image**: One portfolio image can be marked as the "Cover/Featured" image for display on Search Cards and the Dashboard.
