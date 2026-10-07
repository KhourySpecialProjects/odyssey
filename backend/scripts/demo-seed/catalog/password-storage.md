---
name: Storing Passwords Safely
description: Hash passwords so a stolen database doesn't hand attackers your users' accounts.
overview: Any database can leak, so passwords have to be stored in a form that's close to useless to an attacker. This droplet explains why plain hashes fail, how salts and slow password hashes like Argon2 fix that, and how to use them correctly in Python.
funFact: Salting is older than the web: Unix was already salting its stored password hashes in the late 1970s.
authors: contentcreator1
type: knowledge
focusArea: technical
difficulty: advanced
tags: security
objectives:
- Explain why plain text and fast hashes put users at risk
- Describe how salts and work factors slow attackers down
- Hash and verify passwords with a maintained library
- Upgrade old password hashes when users log in
---

# Why plain text and plain hashes fail

Plan as if your database will leak someday. It can happen through SQL injection, a misconfigured backup, a stolen laptop or an access key pushed to a public repository. What matters is what an attacker can do with the password column once they have it.

## Plain text

If you store passwords exactly as people typed them, a breach hands over every one of them. The damage doesn't stop at your site. Many people reuse passwords, so attackers try each leaked email and password on other services, which is called credential stuffing. A leak from a club website can unlock someone's email account.

Encrypting the passwords doesn't fix this. Anything encrypted can be decrypted with the key, and the key usually lives on the same servers the attacker just got into. Your server never needs to read a password back. It only needs to check whether a login attempt matches, and that's a job for a one-way function.

%definition A cryptographic hash function turns any input into a fixed-size output, and it's designed so that you can't work backward from the output to the input.

## Plain hashes

Storing a SHA-256 hash of each password looks like it solves the problem:

```python
import hashlib

def weak_hash(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

print(weak_hash("password"))
```

```text
5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8
```

It has two serious flaws.

- **The same password always gives the same hash.** Everyone who chose "password" has the same entry in your table, so cracking one cracks them all. Attackers also precompute hashes for millions of common and leaked passwords, then look up stolen hashes in those tables almost instantly.
- **It's fast.** SHA-256 is designed to be quick, which is great for checking a download and terrible here. A single modern graphics card can compute billions of SHA-256 hashes per second, so an attacker can test huge lists of likely passwords against every stolen hash. MD5 and SHA-1, which you'll still find in old systems, are even faster.

%important A fast, general purpose hash like SHA-256 isn't safe for passwords, even with a salt. Use a hash designed for passwords.

%%multiple-choice
- Why is SHA-256 on its own a poor way to store passwords?
- Attackers can decrypt SHA-256 hashes if they find the key
- It's fast, so attackers can test billions of guesses per second <
- Its output is too long to store in a database
- It gives a different output each time for the same password

# Salts and slow password hashes

## Salts

A **salt** is a random value generated for each user when they set a password. The system hashes the salt together with the password and stores the salt right next to the hash. The salt isn't a secret. Its job is to make every hash unique:

- Two users with the same password get different hashes, so cracking one doesn't reveal the other.
- Precomputed tables stop working, because an attacker would need a separate table for every salt.
- An attacker has to guess against each hash separately.

Generate a new salt from a secure random source every time a password is set or changed. Password hashing libraries do this for you. argon2-cffi, for example, uses 16 random bytes for each hash.

## Slow on purpose

A salt doesn't make a single guess any slower. An attacker going after one account can still try billions of SHA-256 guesses per second. Password hashing functions are built to be slow instead, and you choose how slow with settings called the **work factor**.

| Function | What you tune | Good to know |
|---|---|---|
| bcrypt | A cost, where each step up doubles the work | Only uses the first 72 bytes of a password |
| scrypt | A CPU and memory cost, block size and parallelism | Needs lots of memory, which makes custom cracking hardware expensive |
| Argon2 | Time, memory and parallelism | Won the 2015 Password Hashing Competition, and Argon2id is the variant to use |

Tune the work factor so hashing is as slow as your servers can comfortably afford at login. A user won't notice a fraction of a second, but an attacker pays that cost on every guess. As hardware gets faster, raise the settings.

## What a stored hash looks like

```python
from argon2 import PasswordHasher

ph = PasswordHasher()
print(ph.hash("husky2026"))
print(ph.hash("husky2026"))
```

The output looks like this, though your salts and hashes will differ:

```text
$argon2id$v=19$m=65536,t=3,p=4$jr39hgqHixCu6uhpEwV6NA$sJt/6nkqLcBMg61UFtbxDYQ1D7ck/W7Ln/ou+WibtPI
$argon2id$v=19$m=65536,t=3,p=4$kgMbGEXaCACXd4T6cOrbFQ$D/689JCkFaWwAnf6sX6xal/bo2C6/jK8G68UaayuI98
```

The same password gave two different results, because each call generated a new salt. Each string holds everything needed to check a password later: the algorithm (`argon2id`), its version, the settings (64 MiB of memory, 3 passes and 4 parallel lanes), then the salt and the hash, both base64-encoded. You store that one string for each user.

%caution bcrypt only uses the first 72 bytes of a password. Depending on the library and version, longer passwords are either cut off without warning or rejected, so check what yours does.

%%true-false
- A salt has to be kept secret, or it doesn't protect anything.
- false

# Doing it right in code

## Use a maintained library

Don't design your own scheme or implement a hash function yourself. Small mistakes, like reusing a salt, choosing settings that are too weak or comparing hashes in a way that leaks timing information, are easy to make and hard to spot. Use a maintained library or your framework's built-in password support. Django, for example, hashes passwords for you, using PBKDF2 by default and supporting Argon2 and bcrypt.

For Python, argon2-cffi is a solid choice. Install it with `pip install argon2-cffi`, and import it as `argon2`. The [argon2-cffi documentation](https://argon2-cffi.readthedocs.io/) explains how to choose its settings.

## Signing up and logging in

A real app stores hashes in a database table, but a dictionary keeps this example short. Signing up takes one call: `ph.hash` creates a new salt and returns the full encoded string.

```python
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

ph = PasswordHasher()
users: dict[str, str] = {}  # username -> stored hash

def sign_up(username: str, password: str) -> None:
    users[username] = ph.hash(password)
```

Logging in looks up the stored hash and checks the password against it:

```python
def log_in(username: str, password: str) -> bool:
    stored = users.get(username)
    if stored is None:
        return False
    try:
        ph.verify(stored, password)
    except VerifyMismatchError:
        return False
    if ph.check_needs_rehash(stored):
        users[username] = ph.hash(password)
    return True

sign_up("maya", "rainy-campus-lantern-42")
print(log_in("maya", "rainy-campus-lantern-42"))  # True
print(log_in("maya", "husky2026"))                # False
print(log_in("sam", "husky2026"))                 # False, no such user
```

- `ph.verify` takes the stored hash first and the password second. It returns True when they match and raises `VerifyMismatchError` when they don't.
- An unknown username and a wrong password both return False. Show the same message for both, like "Incorrect username or password", so the message doesn't reveal which accounts exist. Careful apps also make both cases take the same time, for example by checking the password against a dummy hash when the username doesn't exist.

%warning Never log passwords or put them in error messages, and only accept them over HTTPS. Also limit failed login attempts, so attackers can't simply guess through your login form.

## Upgrading old hashes

A hash can't be reversed, so the only time you can make a new one is when you briefly have the password: right after a successful login. That's what the last lines of `log_in` do. `check_needs_rehash` returns True when the stored hash was made with different settings than `ph` uses now. If you later raise the memory cost by changing the setup line to `ph = PasswordHasher(memory_cost=131072)`, each older hash gets upgraded the next time its owner logs in.

The same idea moves users off an old scheme, like unsalted SHA-256. When someone logs in, check their password the old way, since `ph.verify` can't read hashes that aren't Argon2 strings. If it matches, replace the old hash with `ph.hash(password)` right away. Accounts that never log in keep their weak hashes, so either require a password reset or wrap the old value: store the Argon2 hash of the old SHA-256 hash, and at login apply SHA-256 to the password before calling `ph.verify`.

%more-information The OWASP Password Storage Cheat Sheet keeps current recommendations for algorithms and settings.

%%open-ended
- Why can you only upgrade a user's password hash when they log in?
- A hash can't be reversed, so you need the plain password to make a new hash, and you only have it briefly when the user types it in to log in.
