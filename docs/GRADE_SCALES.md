# Grade Scales Feature

## Overview

Grade scales define how raw scores map to grade letters, remarks, and grade points used for GPA/CGPA calculations.

## Grade Points and GPA Calculation

### What Are Grade Points?

Grade points are numerical values assigned to each grade that enable GPA (Grade Point Average) calculations. They serve as the bridge between letter grades and numerical performance metrics.

### Standard Nigerian WAEC 9-Point Scale

By default, Gradellence uses the WAEC grading system:

| Grade | Min Score | Max Score | Points | Remark |
|-------|-----------|-----------|--------|--------|
| A1 | 75 | 100 | 5.0 | Distinction |
| B2 | 70 | 74 | 4.0 | Very Good |
| B3 | 65 | 69 | 3.5 | Good |
| C4 | 60 | 64 | 3.0 | Credit |
| C5 | 55 | 59 | 2.5 | Credit |
| C6 | 50 | 54 | 2.0 | Credit |
| D7 | 45 | 49 | 1.5 | Pass |
| E8 | 40 | 44 | 1.0 | Pass |
| F9 | 0 | 39 | 0.0 | Fail |

### How GPA is Calculated

```
GPA = Σ(grade points) / number of subjects
```

**Example:**
- Subject 1: Score 85 → Grade A → Points 5.0
- Subject 2: Score 72 → Grade B → Points 4.0
- Subject 3: Score 45 → Grade F → Points 0.0

**GPA = (5.0 + 4.0 + 0.0) / 3 = 3.0**

### How CGPA is Calculated

CGPA (Cumulative GPA) averages GPA across multiple terms:

```
CGPA = Σ(all term grade points) / Σ(all term subjects)
```

## Grade Scale Management

### Single Scale Updates

**Old Problem:** Updating one grade scale would fail if the new range overlapped with ANY other active scale.

**Solution:** The `update()` method now allows partial updates:
- Changing `grade`, `remark`, `points`, or `isActive` → **No overlap validation needed**
- Changing `minScore` or `maxScore` → **Overlap validation enforced**

### Batch Grade Scale Updates (NEW)

For schools that need to restructure their entire grading system, use **Batch Update**:

1. Navigate to Grade Scales page
2. Click "Batch Edit" button
3. Edit all scales in the table
4. The system validates:
   - No overlapping ranges
   - Each scale has valid min/max
   - All scales have required fields

**API Endpoint:**
```
PUT /api/v1/grade-scales/batch
```

**Request Body:**
```json
{
  "scales": [
    {
      "id": "scale-id-1",
      "grade": "A1",
      "minScore": 75,
      "maxScore": 100,
      "remark": "Distinction",
      "points": 5.0
    },
    {
      "id": "scale-id-2",
      "grade": "B2",
      "minScore": 70,
      "maxScore": 74,
      "remark": "Very Good",
      "points": 4.0
    }
  ],
  "validateOnly": false
}
```

### Validation Rules

1. **No Overlapping Ranges:** Each score can only belong to one grade
   - Valid: A1 (75-100), B2 (70-74), C4 (60-69)
   - Invalid: A1 (70-100), B2 (70-74) → Both include score 70

2. **Min < Max:** Each scale's minimum must be less than maximum

3. **Score Range 0-100:** All scores must be between 0 and 100

4. **Unique Grade Letters:** Each grade letter should be unique per school

## API Endpoints

### Create Single Scale
```bash
POST /api/v1/grade-scales
```

### Create Batch Scales
```bash
POST /api/v1/grade-scales/batch
```

### Update Single Scale
```bash
PUT /api/v1/grade-scales/:id
```

### Update Batch Scales
```bash
PUT /api/v1/grade-scales/batch
```

### Validate Batch (Dry Run)
```bash
PUT /api/v1/grade-scales/batch
{ "scales": [...], "validateOnly": true }
```

### Toggle Active Status
```bash
PATCH /api/v1/grade-scales/:id/activate
```

## Migration Guide

### Before (v1.0)
```typescript
// Would fail if ANY scale overlapped
await gradeScaleService.update(id, { minScore: 75, maxScore: 100 });
```

### After (v1.1)
```typescript
// Single scale update - no overlap check if range unchanged
await gradeScaleService.update(id, { grade: 'A', remark: 'New Remark' });

// Or use batch update for restructuring
await gradeScaleService.updateBatch({
  scales: [
    { id: 'a1', minScore: 75, maxScore: 100, grade: 'A1', points: 5.0 },
    { id: 'b2', minScore: 70, maxScore: 74, grade: 'B2', points: 4.0 },
    // ... all scales
  ]
});
```

## Troubleshooting

### "Overlaps with existing grade" Error

**Solution 1:** Use Batch Edit to update all scales simultaneously
**Solution 2:** Temporarily deactivate the conflicting scale
**Solution 3:** Adjust your range to avoid overlap

### Grade Points Not Showing in GPA

**Check:**
1. Each grade scale has `points` value set
2. The scale is `isActive: true`
3. Results have been computed using this scale
4. The score falls within the scale's range

### Creating Custom Grading Scales

For schools using different systems (e.g., 7-point, 5-point):

```json
{
  "scales": [
    { "grade": "A", "minScore": 80, "maxScore": 100, "remark": "Excellent", "points": 5.0 },
    { "grade": "B", "minScore": 70, "maxScore": 79, "remark": "Very Good", "points": 4.0 },
    { "grade": "C", "minScore": 60, "maxScore": 69, "remark": "Good", "points": 3.0 },
    { "grade": "D", "minScore": 50, "maxScore": 59, "remark": "Pass", "points": 2.0 },
    { "grade": "F", "minScore": 0, "maxScore": 49, "remark": "Fail", "points": 0.0 }
  ]
}
```
