# Security Specification: Classrooms Portal

## 1. Data Invariants
- A classroom must have a valid `userId` matching the creator's UID.
- The classroom ID must be a safe, clean identifier.
- Student list sizes within a classroom are bounded (e.g., maximum 100 students) to prevent Denial of Wallet resource attacks.
- Only the authenticated owner can read, write, update, or delete their own classrooms.

## 2. The "Dirty Dozen" Threat Payloads
Here are the mock/threat payloads designed to verify security rules:
1. **Unauthorized Read**: Reading a classroom belonging to another UID.
2. **Identity Spoofing on Create**: Creating a classroom with `userId` of another user.
3. **Ghost Field Injection**: Adding unapproved fields like `isAdmin: true` or `systemOverload: true`.
4. **Huge Classroom Name**: Creating or updating a classroom with a name exceeding 100 characters.
5. **Junk Classroom ID**: Creating a classroom document with an ID containing malicious symbols or exceeding 128 characters.
6. **No Auth Access**: Attempting to read or write without any authenticated session.
7. **Identity Spoofing on Update**: Attempting to change the `userId` field to a different UID on update.
8. **Malicious Student Array**: Attempting to write a students list exceeding 100 entries.
9. **Malicious Student Name Type**: Writing a student name as a boolean or number.
10. **Malicious Student Name Size**: Injecting a 1MB student name.
11. **Immutability Breach**: Attempting to change `createdAt` on update.
12. **Future Timestamp Spoof**: Sending client-crafted future timestamps instead of server's `request.time`.

## 3. Threat Table & Mitigations
| Threat Vector | Mitigation Strategy | Rule Condition |
| --- | --- | --- |
| No Auth Write | Strict `request.auth != null` checks | `isSignedIn()` |
| Name Poisoning | Size verification on name string | `data.name.size() <= 100` |
| Identity Theft | Ownership verification in token | `data.userId == request.auth.uid` |
| Immutability Hack | Immutability validation for `createdAt` and `userId` | `incoming().userId == existing().userId && incoming().createdAt == existing().createdAt` |
