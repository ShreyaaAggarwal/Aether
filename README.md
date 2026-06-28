# AETHER — Enterprise Telemetry Terminal

AETHER is a production-inspired enterprise telemetry dashboard built for **Frontend Battle**, organized by **IIT Bhubaneswar**. The project simulates how modern enterprise teams monitor large-scale RPA (Robotic Process Automation) workflows through a real-time command center. Built entirely on the frontend, AETHER focuses on handling continuously updating datasets while delivering a fast, scalable, and operator-friendly experience.

Instead of treating a dashboard as a collection of UI components, AETHER approaches it as an interactive operating console where thousands of telemetry updates can be explored, filtered, paused, inspected, and exported without compromising responsiveness.

---

## Inspiration

Enterprise monitoring dashboards are expected to process large volumes of live operational data while remaining responsive and easy to navigate. AETHER was built to explore that challenge from a frontend engineering perspective.

The goal wasn't simply to design an attractive interface—it was to build an application capable of handling continuous telemetry updates, large datasets, complex interactions, and multiple operator workflows while maintaining a smooth user experience.

---

# Features

### Core Features

### 1. Real-Time Telemetry Streaming

Processes incoming telemetry updates continuously from the provided streaming pipeline and reflects live operational changes across the dashboard.

### 2. Global Pause / Resume Pipeline

Pause the live telemetry stream at any moment without interrupting the background data pipeline.

### 3. Buffered Queue During Pause

Incoming updates continue to accumulate safely while the interface remains frozen, ensuring zero data loss.

### 4. Replay Buffered Updates

When streaming resumes, all queued updates are replayed automatically in the correct order.

### 5. Interactive KPI Dashboard

Live metrics continuously summarize streamed rows, robots deployed, and cumulative business savings.

### 6. Multi-Column Sorting

Supports single-column sorting as well as Shift+Click multi-column sorting for complex data exploration.

### 7. Intelligent Global Search

Instantly searches across multiple project attributes using tokenized matching for fast discovery.

### 8. Multi-Select Filtering

Filter telemetry using multiple categories simultaneously, including:

* Automation Type
* Department
* Industry
* Status

### 9. Virtualized Data Grid

Only visible rows are rendered, allowing the interface to remain performant even with continuously updating datasets.

### 10. Alert Stack

Automatically surfaces important operational events as contextual notifications without interrupting the workflow.

### 11. Workspace Customization

Operators can show or hide dashboard modules to personalize their workspace without affecting live telemetry.

### 12. Footer Diagnostics

Displays runtime diagnostics including FPS, rendered rows, queue depth, streaming state, and other performance indicators.

---

# Bounty Features

### Inspector Viewport

While the global stream is paused, selecting any telemetry row opens a dedicated inspector panel.

The inspector provides a detailed breakdown of the selected project, allowing operators to inspect every available attribute without affecting the running stream.

---

### Snapshot Export

Export the currently visible dataset as a CSV snapshot directly from the browser.

The export respects:

* Active search query
* Applied filters
* Multi-column sorting

The export is generated entirely on the client side without interrupting the live telemetry pipeline.

---

# Tech Stack

| Technology        | Purpose                     |
| ----------------- | --------------------------- |
| React             | Component-based UI          |
| Vite              | Development & Build Tool    |
| JavaScript (ES6+) | Application Logic           |
| CSS3              | Styling & Responsive Layout |
| HTML5             | Structure                   |
| Git & GitHub      | Version Control             |

---

## Project Structure

```text
Aether/
│
├── frontend/
│   │
│   ├── public/
│   │   ├── dataStream.js              # Official streaming pipeline
│   │   ├── rpa_database_2026.csv      # Telemetry dataset
│   │   └── favicon.ico
│   │
│   ├── src/
│   │   │
│   │   ├── components/
│   │   │   │
│   │   │   ├── alerts/
│   │   │   │   └── AlertStack.jsx
│   │   │   │
│   │   │   ├── filters/
│   │   │   │   ├── MultiSelectDropdown.jsx
│   │   │   │   └── SearchBar.jsx
│   │   │   │
│   │   │   ├── footer/
│   │   │   │   └── FooterDiagnostics.jsx
│   │   │   │
│   │   │   ├── grid/
│   │   │   │   ├── VirtualizedGrid.jsx
│   │   │   │   ├── GridHeader.jsx
│   │   │   │   ├── GridRow.jsx
│   │   │   │   └── GridCell.jsx
│   │   │   │
│   │   │   ├── inspector/
│   │   │   │   ├── InspectorPanel.jsx
│   │   │   │   └── StatusRadar.jsx
│   │   │   │
│   │   │   ├── kpi/
│   │   │   │   └── KpiRibbon.jsx
│   │   │   │
│   │   │   ├── layout/
│   │   │   │   ├── AmbientGrid.jsx
│   │   │   │   ├── GlobalHeader.jsx
│   │   │   │   └── PauseControl.jsx
│   │   │   │
│   │   │   └── panels/
│   │   │       └── WorkspaceToggleBar.jsx
│   │   │
│   │   ├── context/
│   │   │
│   │   ├── engines/
│   │   │   ├── StreamEngine.js        # Core streaming engine
│   │   │   ├── sortEngine.js          # Multi-column sorting
│   │   │   ├── searchEngine.js        # Global search engine
│   │   │   ├── filterEngine.js        # Filtering engine
│   │   │   └── alertEngine.js         # Alert generation
│   │   │
│   │   ├── hooks/
│   │   │   ├── useStreamEngine.js
│   │   │   ├── useWorkspace.js
│   │   │   ├── useRollingCounter.js
│   │   │   ├── useVirtualizedWindow.js
│   │   │   └── useFpsMonitor.js
│   │   │
│   │   ├── services/
│   │   │   └── streamService.js
│   │   │
│   │   ├── styles/
│   │   │   ├── alerts.css
│   │   │   ├── footer.css
│   │   │   ├── grid.css
│   │   │   ├── inspector.css
│   │   │   ├── kpi.css
│   │   │   ├── layout.css
│   │   │   ├── tokens.css
│   │   │   └── toolbar.css
│   │   │
│   │   ├── utils/
│   │   │   └── formatters.js
│   │   │
│   │   ├── App.jsx                    # Root application
│   │   ├── main.jsx                   # React entry point
│   │   ├── App.css
│   │   └── index.css
│   │
│   ├── package.json
│   ├── vite.config.js
│   ├── eslint.config.js
│   └── index.html
│
└── README.md
```
```

The project follows a modular architecture where rendering, streaming, filtering, searching, sorting, alerts, and workspace management are separated into independent modules, making the application easier to maintain and extend.

---

# Performance Optimizations

Performance was one of the primary goals throughout development.

### Virtualized Rendering

Only the rows currently visible inside the viewport are rendered, allowing the interface to scale efficiently with large datasets.

### Memoization

Expensive computations such as sorting, searching, filtering, and KPI calculations are memoized to reduce unnecessary work.

### Streaming Engine

A dedicated streaming engine manages incoming telemetry independently of React rendering, ensuring the UI only updates when required.

### Buffered Updates

During pause mode, incoming telemetry is safely buffered and replayed on resume, preventing data loss while avoiding unnecessary re-renders.

### Efficient Sorting & Filtering

Sorting, searching, and filtering are performed using optimized utility engines to keep interactions responsive even under continuous data updates.

### Client-Side Export

CSV snapshots are generated entirely in the browser without requiring any backend services or interrupting live operations.

---

# Getting Started

Clone the repository

```bash
git clone https://github.com/ShreyaaAggarwal/Aether.git
```

Navigate into the project

```bash
cd Aether/frontend
```

Install dependencies

```bash
npm install
```

Run the development server

```bash
npm run dev
```

Build for production

```bash
npm run build
```

Preview the production build

```bash
npm run preview
```

---

# Future Improvements

* Real-time WebSocket integration
* Authentication & role-based access
* Historical telemetry playback
* Advanced analytics dashboards
* Theme customization
* Collaborative monitoring
* Cloud deployment with live backend integration

---

# Author

**Shreya Aggarwal**

Frontend Developer | B.Tech CSE

GitHub: https://github.com/ShreyaaAggarwal

If you found this project interesting, feel free to explore the repository or share your feedback.
