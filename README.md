# Mapiles DTR

A modern, high-performance **Daily Time Record (DTR) and Payroll Management System** engineered to streamline workforce tracking and automate complex wage workflows. Built on a type-safe architecture featuring Laravel 13, React 19, and Inertia.js.

---

## ✨ Features

*   **Employee Scheduling:** Seamlessly organize and manage staff using configurable weekly schedule groups.
*   **Attendance Tracking:** Precise monitoring of daily operational workflows using native time-in and time-out logging.
*   **Automated Payroll Engine:**
    *   Instantaneous calculation of daily and hourly baseline rates.
    *   Strict enforcement of grace periods, half-day thresholds, and late penalties (₱1/minute).
    *   Advanced holiday pay algorithms: Regular Holidays (200% base) and Special Working Holidays (130% base).
    *   Overtime computations embedded with standard 25% premium multipliers.
*   **Verification & Export:** Simple DTR sheet confirmation pipelines with built-in export modules to PDF and CSV formats.
*   **Security & Guardrails:**
    *   Granular role-based access control (RBAC) separating Admin, Management, and Employee privileges.
    *   Secure, robust Two-Factor Authentication (2FA) handled directly via Laravel Fortify.
    *   Comprehensive, automated system audit logging tracking structural modifications.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Backend** | PHP 8.3, Laravel 13 |
| **Frontend** | React 19, TypeScript, Inertia.js |
| **Styling** | Tailwind CSS 4, shadcn/ui |
| **Database** | PostgreSQL (Production) / SQLite (Local Sandbox) |
| **PDF Generation**| DomPDF |
| **Authentication**| Laravel Fortify |

---

## 🚀 Local Setup

Run the following commands sequentially inside your terminal environment to initialize your local workspace:

```bash
# 1. Clone the repository and navigate into the project directory
git clone <repo-url>
cd mapiles-dtr

# 2. Install composer packages and backend framework extensions
composer install

# 3. Replicate the baseline environment setup file
cp .env.example .env

# 4. Generate your unique secure application encryption key
php artisan key:generate

# 5. Download frontend packages and compile asset bundles
npm install
npm run build

# 6. Initialize local database structures and insert seed testing records
php artisan migrate --seed

# 7. Boot up the local PHP development server engine
php artisan serve
