# 🛡️ Fair Usage Policy - Token-Based Packages

## Overview

**All packages are UNLIMITED queries** - users can ask as many questions as they want **within their token allocation**.

**No artificial query limits.** Users are limited only by:
- ✅ Monthly token allocation
- ✅ Fair usage throttling (when approaching limits)
- ✅ Automatic rate limiting (prevents abuse)

---

## 📊 Token Allocations

| Package | Input | Output | Total | Typical Usage |
|---------|-------|--------|-------|---------------|
| Free | 17K | 33K | 50K | Light exploration |
| Basic | 1M | 600K | 1.6M | Daily student use |
| Regular | 4M | 2M | 6M | Active research |
| Premium | 7M | 3M | 10M | Power user |

---

## 🚦 Fair Usage Throttling (Phase 2.5)

### **How It Works:**

Users get **full speed** until they hit usage thresholds:

```
  0-79%  → Full speed, no restrictions ✅
 80-89%  → Gentle warning, still full speed ⚠️
 90-94%  → Slight throttling (2 sec delay) ⏸️
 95-99%  → Strong throttling (5 sec delay) 🐌
  100%   → Monthly limit reached 🛑
```

### **User Experience:**

**At 80% usage:**
```
⚠️ Notice: You've used 80% of your monthly tokens
   Consider upgrading to avoid slowdowns
   [View Usage] [Upgrade Plan]
```

**At 90% usage:**
```
⚠️ Warning: You've used 90% of your tokens
   Slight delays may occur to prevent overuse
   Remaining: 100K tokens (~10 queries)
   [Upgrade Now]
```

**At 95% usage:**
```
🚨 Critical: Only 5% of tokens remaining
   Queries are throttled (5 second cooldown)
   Upgrade to continue at full speed
   [Upgrade Plan]
```

**At 100%:**
```
🛑 Monthly limit reached
   Your tokens will reset on [Date]
   
   Options:
   - Wait until reset (X days)
   - Upgrade to higher plan
   - Purchase additional tokens (coming soon)
```

---

## ⚖️ Why Fair Usage Instead of Query Limits?

### **Query Limits = BAD UX:**
❌ "You have 5 queries left today"  
❌ Artificial restrictions  
❌ Doesn't account for query complexity  
❌ User anxiety about "wasting" queries  

### **Token-Based Fair Usage = GOOD UX:**
✅ "You have 500K tokens remaining"  
✅ Natural usage boundaries  
✅ Complex queries use more, simple use less  
✅ Users understand they're paying for compute  
✅ Transparent and predictable  

---

## 💡 Key Messaging

### **On Pricing Page:**
> **Unlimited queries within your token allocation**
> All plans include access to all books. Fair usage policy applies.

### **On Dashboard:**
> **You've used 45% of your monthly tokens**
> Keep asking questions - plenty of tokens left!

### **In Features:**
- ✅ "Unlimited queries within tokens"
- ✅ "Fair usage policy ensures great experience"
- ✅ "Automatic throttling prevents overuse"
- ❌ NOT "100 queries per month"
- ❌ NOT "Limited to X questions"

---

## 🎯 User Expectations by Tier

### **Free (50K tokens):**
- Light usage, trying platform
- ~10-20 queries total (lifetime)
- Educational: "Get a feel for the platform"

### **Basic (1.6M tokens/month):**
- Regular student use
- ~50-150 queries/month depending on complexity
- Educational: "Perfect for coursework and light research"

### **Regular (6M tokens/month):**
- Active researchers
- ~200-600 queries/month
- Educational: "Extensive reading and in-depth research"

### **Premium (10M tokens/month):**
- Power users, content creators
- ~500-1000 queries/month
- Educational: "Maximum capacity for heavy usage"

---

## 🔧 Technical Implementation

### **Already Built (Phase 2.5):**

✅ **fair_usage_middleware.py**
- Checks token usage before each query
- Returns throttling status
- Calculates remaining tokens

✅ **Token tracking**
- Tracks input/output separately
- Updates after each query
- Monthly reset

✅ **Rate limiting**
- Prevents abuse
- Gradual throttling
- Claude-style pause messages

### **Frontend Integration:**

```typescript
// In query.tsx or wherever queries are made
const response = await fetch('/api/query', {
  method: 'POST',
  body: JSON.stringify({ question, book_ids }),
});

const data = await response.json();

// Show warnings if needed
if (data.usage_percentage >= 80) {
  showWarningToast(`You've used ${data.usage_percentage}% of your tokens`);
}

if (data.throttled) {
  showInfoToast('Slight delay applied to manage high usage');
}
```

---

## 📈 Upgrade Prompts

**Smart prompts based on usage:**

**At 50% (not shown):**
```
// No prompt - user still has plenty
```

**At 80% (gentle notice):**
```
💡 Tip: You're using tokens faster than expected!
   Upgrade to Regular for 4x more capacity
   [View Plans]
```

**At 95% (urgent):**
```
🚨 Almost out of tokens!
   Upgrade now to continue without interruption
   
   [Upgrade to Basic - ₹99] [Upgrade to Regular - ₹299]
```

**At 100% (conversion opportunity):**
```
🛑 You've reached your monthly limit
   
   You clearly love the platform! 🎉
   Upgrade for unlimited access:
   
   Basic (₹99)   → 1.6M tokens → [Upgrade]
   Regular (₹299) → 6M tokens  → [Upgrade] ⭐ Recommended
   Premium (₹499) → 10M tokens → [Upgrade]
```

---

## ✅ Summary

**Philosophy:**
- Unlimited queries, finite compute (tokens)
- Fair usage prevents abuse, not usage
- Transparent and user-friendly
- Natural upgrade path based on actual need

**User messaging:**
- "Unlimited queries" ✅
- "Within your token allocation" ✅
- "Fair usage applies" ✅
- NOT "X queries per month" ❌

**Experience:**
- Users query freely until 80% used
- Gentle warnings guide upgrade decisions
- Throttling only at extreme usage (95%+)
- Clear upgrade path when needed

---

**This creates a premium experience while maintaining healthy economics!** 🎯
