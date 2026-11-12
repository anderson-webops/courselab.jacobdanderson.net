# ECE 6612 coverage

Reviewed November 12, 2026. The public collection contains 26 original lessons, 26 reference figures, 11 adjustable models and 52 attempt-first questions. Topic order follows the course's actual concept sequence. The syllabus supplies the overall scope; slides and lecture notes establish the material available for each topic.

| Course material | Public lessons | Adjustable investigations |
| --- | --- | --- |
| Introduction, network overview; symmetric crypto; hashes/message digests; public-key crypto (01–05) | Security goals, modes, authenticated encryption, hashes/MACs, signatures, key establishment | Repeated keystream, birthday probability, tiny Diffie–Hellman arithmetic |
| Link-layer and network-layer security (06–07) | Link trust, authenticated tunnels and VPN termination | Provider chain versus nested tunnels |
| Routing and transport (08–09) | BGP policy/origin validation, TCP byte counters, injection/disruption | Same-prefix selection versus longest-prefix forwarding; independent TCP byte spaces |
| DNS and DNSSEC (10–11) | Query/cache matching, signed data and trust-chain validation | Forged-reply probability with source-port entropy |
| TLS/certificates and QUIC (12–14) | Session keys/identity, records/downgrades, QUIC transport | Cumulative QUIC anti-amplification budget |
| Web basics/security/authentication (15–17) | Origins/cookies, injection, CSRF/CORS, password verifiers, SSO/passkeys | Offline password work under explicit candidate and hardware assumptions |
| Email security (18) | Domain authentication/alignment; transport and end-to-end protection | Original policy and message-flow cases |
| Network access control/DoS; malware (19–20) | Filtering/state, availability/reflection/backscatter, propagation/command and control/detection | Packet/byte budgets, amplification, bounded early worm growth |

The conceptual lab review contributes byte-level reasoning, capture interpretation, DNS validation, browser execution boundaries and email authentication. Public examples use fresh values and generic scenarios. Raw course documents, captures, personal work, grades, credentials and lab addresses remain in the private class workspace.

## Taught cutoff and remaining depth

- Recorded lecture coverage reviewed through **November 10, 2026**, ending with SYN cookies. Later DoS material, including amplification/CDN defenses and telescopes, and malware follow the supplied slides. The November 12 recording remains to be reviewed.
- Lessons describe protocol mechanisms and security decisions. Cryptographic round internals, exhaustive packet-header field catalogs, vendor-specific BGP/firewall commands, full protocol implementations and research-project measurements remain outside this edition's depth.
- Models expose a defined relationship using small examples. Tiny RSA/Diffie–Hellman values demonstrate algebra; the XOR model demonstrates keystream reuse. Probability models state independence/uniformity assumptions. Password hardware cost is an input, and worm growth uses an explicitly bounded early-phase approximation.
- VPN visibility assumes the illustrated tunnel termination, routing and application encryption. Provider collusion, traffic correlation, DNS paths, endpoint compromise and operational implementation require additional evidence in a real evaluation.
- Lecture slides and older protocols supply historical context. TLS 1.0/1.1 and legacy ciphers appear to explain protocol evolution and attacks. Contemporary protocol specifications support the mechanism checks; operational support varies with implementations and configuration.

## Compatibility and validation

The existing authenticated-encryption and TLS topic URLs retain their original question prompts and saved-attempt keys. Shared navigation, controls, source-local search, progress export/import and origin-local storage continue through the existing components. All internal navigation uses relative links, while canonical URLs identify courselab. Alias navigation retains the requested hostname.

Validation covers original numerical anchors, model invariants and parameter corners, every lesson URL, relative links and fragments, local assets and CSP, staged feedback, saved state, invalid control parameters, both requested hostnames, and desktop/mobile layouts. Release evidence stays in the repository's ignored local work area; immutable release assets contain only the accepted public artifact.
