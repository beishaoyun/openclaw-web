# Bug Fix Report - UUID Authentication Error

**Date**: 2026-03-28
**Severity**: Critical (P0)
**Status**: Fixed

---

## Problem

**Error Message**:
```
添加服务器失败：invalid input syntax for type uuid: 'user-id'
```

**Root Cause**:
The frontend authentication hook (`frontend/src/hooks/useAuth.ts`) was using a hardcoded string `'user-id'` instead of the actual user UUID returned from the backend login response.

**Impact**:
- All authenticated operations failed (adding servers, managing channels, etc.)
- PostgreSQL rejected the string `'user-id'` when used in UUID column queries
- Users could not perform any actions requiring authentication

---

## Analysis

### Backend Code (Correct)

The backend was correctly returning user data in the login response:

```typescript
// backend/src/modules/auth/auth.routes.ts:176-184
reply.send({
  token,
  expiresIn: '7d',
  user: {
    id: user.id,        // Actual UUID from database
    email: user.email,
    phone: user.phone,
  },
});
```

### Frontend Code (Buggy)

```typescript
// frontend/src/hooks/useAuth.ts:18 (BEFORE FIX)
setToken(data.token, {
  id: 'user-id'  // ❌ Hardcoded string, not actual UUID
});
```

### Database Query (Failed)

```typescript
// backend/src/modules/server/server.routes.ts:129-130
INSERT INTO servers (user_id, ...)
VALUES (${userId}, ...)  // userId = 'user-id' (invalid UUID)
```

PostgreSQL error: `invalid input syntax for type uuid: 'user-id'`

---

## Solution

### Files Modified

#### 1. `frontend/src/hooks/useAuth.ts`

**Before**:
```typescript
setToken(data.token, {
  id: 'user-id',  // TODO: 解析实际用户信息
});
```

**After**:
```typescript
setToken(data.token, {
  id: data.user?.id,
  email: data.user?.email,
  phone: data.user?.phone,
});
```

#### 2. `frontend/src/pages/auth/Register.tsx`

**Added**:
```typescript
// 自动登录 - 保存 token 和用户信息
localStorage.setItem('token', data.token);
// 使用后端返回的实际用户信息
const user = data.user || { id: data.id, email: data.email };
localStorage.setItem('user', JSON.stringify(user));
window.location.href = '/';
```

---

## Verification

### Code Review

1. **Backend auth routes**: Correctly returns user UUID in login/register responses
2. **Frontend useAuth.ts**: Now extracts and uses actual user data
3. **Auth store**: Correctly stores user data in Zustand store
4. **Server routes**: Correctly extracts user ID from JWT token via middleware

### Test Scenarios

The following flows should now work correctly:

1. **User Registration** → Auto-login with actual user UUID
2. **User Login** → Token stored with actual user UUID
3. **Add Server** → `user_id` column receives valid UUID
4. **List Servers** → Query filters by valid UUID
5. **All authenticated operations** → User context is correct

---

## Prevention

### Recommendations

1. **Remove TODO comments in critical paths**: The TODO comment indicated uncertainty that should have been addressed immediately
2. **Add TypeScript strict types**: The `any` type for user data allowed this bug to slip through
3. **Add integration tests**: End-to-end tests would have caught this immediately
4. **Code review checklist**: Verify all authentication data flows

### Future Improvements

- [ ] Add TypeScript interfaces for all API responses
- [ ] Add E2E tests for authentication flow
- [ ] Add database integration tests
- [ ] Implement proper error boundaries

---

## Related Files

- `frontend/src/hooks/useAuth.ts` - Authentication hook (fixed)
- `frontend/src/pages/auth/Register.tsx` - Registration page (enhanced)
- `frontend/src/store/auth.store.ts` - Auth state management (verified)
- `backend/src/modules/auth/auth.routes.ts` - Auth API (verified)
- `backend/src/middleware/auth.ts` - JWT middleware (verified)
- `backend/src/modules/server/server.routes.ts` - Server management (verified)

---

**Fixed By**: Claude Code
**Reviewed By**: Pending user verification
**Verification Status**: Code review complete, user testing required
