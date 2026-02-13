# Multi-Client Access Feature - Executive Summary

---

## What We're Building

Currently, each user in our system can only belong to one company (client). This creates problems when:

- **Contractors** inspect equipment for multiple companies and need separate logins for each
- **Support staff** need to troubleshoot issues across different client accounts
- **Regional managers** oversee multiple client organizations

This feature allows a single user account to access multiple companies, each with appropriate permissions for that company.

---

## Business Value

- **Reduced account management** - No more creating duplicate accounts for the same person
- **Better user experience** - Users switch between companies without logging out
- **Flexible permissions** - A user can be an admin at one company and a basic inspector at another
- **Audit trail** - All activity ties back to one person, even across companies

---

## Overall Progress: ~70-75% Complete

| Area | Progress | Status |
|------|----------|--------|
| Backend (the "engine") | ~90% | Core functionality complete |
| Frontend (what users see) | ~55-60% | Basic flows working, admin screens needed |

---

## What Users CAN Do Today

| Capability | Status |
|------------|--------|
| Switch between organizations using a dropdown | Working |
| Accept email invitations to join new organizations | Working |
| Send invitations to others (Client Admins) | Working |
| View their role and assigned site for each organization | Working |
| System remembers which organization is selected | Working |

---

## What Users CANNOT Do Yet

| Gap | Impact |
|-----|--------|
| **Manage team access** | Admins can't see or remove users from their organization |
| **Change user roles** | Once someone joins, their role is fixed - no way to promote or demote |
| **Create custom roles** | Only FC Safety staff can create roles; client admins cannot customize |
| **Seamless switching** | Some screens require a page refresh after switching organizations |

---

## Remaining Work

| Task | Effort | Priority | Notes |
|------|--------|----------|-------|
| Fix data refresh after switching | Low | **High** | Quality-of-life fix |
| User access management screen | Medium | **High** | Core admin functionality |
| Edit user roles within organization | Medium | Medium | Needed for ongoing management |
| Finish invitation backend | Low | Medium | Frontend ready, backend needs completion |
| Client-level role management | Medium | Low | Nice-to-have for larger clients |
| Capability-based UI permissions | High | Medium | Show/hide features based on user role |

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Invitation system has frontend complete but backend may have gaps | Needs verification before launch |
| Data isolation between organizations may have gaps | Ensure organization ID is passed consistently in all system calls |
| Some admin features only available to FC Safety staff | Acceptable for initial launch; client admin features can follow |

---

## Recommendation

The feature is functional for **basic multi-organization access**. Users can switch organizations, accept invitations, and work within each organization.

For a **minimum viable launch**, complete:
1. Data refresh fix (Low effort)
2. User access management screen (Medium effort)

The remaining items (role editing, custom roles, granular permissions) can be delivered in a follow-up release.
