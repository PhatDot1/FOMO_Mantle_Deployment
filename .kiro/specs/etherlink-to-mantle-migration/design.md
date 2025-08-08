# Design Document

## Overview

This design outlines the systematic migration of FOMO Insurance's frontend and documentation from Etherlink to Mantle network branding. The migration will update all user-facing content, visual elements, and network references while maintaining the existing smart contract architecture and functionality. The approach prioritizes consistency, accuracy, and minimal disruption to the user experience.

## Architecture

### Migration Scope
The migration focuses on three primary layers:
1. **Content Layer**: Text content, documentation, and messaging
2. **Visual Layer**: Logos, branding elements, and network indicators  
3. **Configuration Layer**: Network references and external links

### Non-Migration Scope
The following components will remain unchanged:
- Smart contract addresses and ABIs
- Core application logic and functionality
- Wallet connection mechanisms
- Transaction handling and state management

## Components and Interfaces

### 1. Documentation Components
**Files Affected:**
- `README.md` - Primary project documentation
- `.kiro/steering/product.md` - Product overview steering file
- `.kiro/steering/tech.md` - Technical steering file

**Changes Required:**
- Replace all instances of "Etherlink" with "Mantle"
- Update network benefits description to reflect Mantle's advantages
- Modify deployment references from Etherlink testnet/mainnet to Mantle equivalents
- Update technical specifications to reference Mantle network details

### 2. Landing Page Components
**Files Affected:**
- `app/page.tsx` - Main landing page component

**Changes Required:**
- Hero section: Update network references in descriptive text
- "Powered by" section: Complete rebrand from Etherlink to Mantle
  - Replace Etherlink logo with Mantle logo
  - Update section title and description
  - Modify network benefits list to highlight Mantle advantages
- FAQ section: Update network-specific answers
- Footer: Update explorer links to point to Mantle explorer

### 3. Application Interface Components
**Files Affected:**
- `app/app/page.tsx` - Main application interface
- `app/faucet/page.tsx` - Token faucet page

**Changes Required:**
- Network badges: Change "Etherlink Testnet" to "Mantle Testnet"
- Faucet instructions: Update all references to mention Mantle testnet
- Help text and descriptions: Ensure consistency with Mantle branding
- External links: Update explorer and documentation links

### 4. Metadata and Configuration
**Files Affected:**
- `app/layout.tsx` - Root layout and metadata

**Changes Required:**
- Update page metadata to reflect Mantle positioning
- Ensure SEO-friendly descriptions mention Mantle appropriately

## Data Models

### Network Reference Model
```typescript
interface NetworkBranding {
  name: string;           // "Mantle" | "Mantle Testnet"
  displayName: string;    // User-facing network name
  benefits: string[];     // Network advantage descriptions
  explorerUrl: string;    // Block explorer URL
  logoPath: string;       // Path to network logo asset
}
```

### Content Replacement Model
```typescript
interface ContentReplacement {
  searchTerm: string;     // Text to find (e.g., "Etherlink")
  replacement: string;    // Replacement text (e.g., "Mantle")
  context: string;        // File or section context
  requiresManualReview: boolean; // Whether replacement needs human verification
}
```

## Error Handling

### Content Consistency Validation
- Implement systematic search to identify all Etherlink references
- Validate that replacements maintain grammatical correctness
- Ensure technical accuracy of network-specific claims
- Verify external links point to valid Mantle resources

### Visual Asset Management
- Ensure Mantle logo assets are available and properly sized
- Validate image paths and accessibility attributes
- Maintain consistent visual styling with existing design system
- Handle fallback scenarios for missing assets

### Link Validation
- Verify all external links point to active Mantle resources
- Ensure explorer links use correct Mantle testnet URLs
- Validate that network-specific documentation links are accurate
- Test all updated links for accessibility and functionality

## Testing Strategy

### Content Verification Testing
1. **Text Replacement Verification**
   - Search entire codebase for remaining "Etherlink" references
   - Verify contextual accuracy of all replacements
   - Ensure no broken sentences or grammatical errors

2. **Visual Consistency Testing**
   - Verify Mantle logo displays correctly across all screen sizes
   - Test network badges and indicators show proper styling
   - Validate color scheme consistency with Mantle branding

3. **Link Functionality Testing**
   - Test all external links navigate to correct Mantle resources
   - Verify explorer links work with sample transactions/addresses
   - Ensure faucet instructions reference correct network

### User Experience Testing
1. **Navigation Flow Testing**
   - Verify user journey remains intuitive with new branding
   - Test that network information is clear and consistent
   - Ensure help text and instructions are accurate

2. **Cross-Browser Compatibility**
   - Test visual elements render correctly across browsers
   - Verify external links work in different environments
   - Validate responsive design with new content

### Regression Testing
1. **Functionality Preservation**
   - Ensure all existing features work unchanged
   - Verify wallet connection and transaction flows
   - Test that only visual/content changes were applied

2. **Performance Impact**
   - Verify page load times remain consistent
   - Test that new assets don't impact performance
   - Ensure SEO metadata updates don't affect search rankings

## Implementation Phases

### Phase 1: Asset Preparation
- Obtain Mantle logo assets in required formats and sizes
- Research Mantle network benefits and technical specifications
- Identify correct Mantle testnet explorer URLs and resources

### Phase 2: Documentation Updates
- Update README.md with Mantle branding and network information
- Modify steering files to reflect Mantle positioning
- Ensure technical accuracy of all network claims

### Phase 3: Frontend Content Migration
- Update landing page content and "Powered by" section
- Modify FAQ responses to reference Mantle network
- Update application interface network indicators

### Phase 4: Link and Reference Updates
- Update all external links to point to Mantle resources
- Modify explorer links throughout the application
- Ensure faucet instructions reference correct network

### Phase 5: Validation and Testing
- Comprehensive search for remaining Etherlink references
- Visual and functional testing across all updated components
- Link validation and accessibility testing