# HOW TO USE THIS PAPER WITH OVERLEAF

## Step 1: Create New Overleaf Project

1. Go to https://www.overleaf.com
2. Sign in or create free account
3. Click **"New Project"** button (top left)
4. Select **"Blank Project"**
5. Name it: `MediTrustChain_IEEE_Paper`

## Step 2: Upload the LaTeX File

### Method A: Copy-Paste (Recommended)

1. In Overleaf, you'll see a default `main.tex` file
2. **DELETE all content** in `main.tex`
3. Open `MediTrustChain_IEEE_Paper_Final.tex` from your local folder
4. **Copy ENTIRE content** (Ctrl+A, Ctrl+C)
5. **Paste** into Overleaf's `main.tex` (Ctrl+V)
6. Click **"Recompile"** button

### Method B: Upload File

1. Click **"Upload"** icon (top left in Overleaf project)
2. Select `MediTrustChain_IEEE_Paper_Final.tex` from your computer
3. Right-click the uploaded file → **"Set as Main Document"**
4. Click **"Recompile"**

## Step 3: Compile the Document

1. Overleaf will automatically try to compile
2. If it doesn't, click the green **"Recompile"** button
3. PDF preview appears on the right side
4. **First compile may take 30-60 seconds** (downloading packages)

## Step 4: Fix Any Compilation Errors

### Common Errors and Fixes:

**Error: "Package algorithm not found"**
- Click on project name (top left) → Settings → Compiler
- Change to **"pdfLaTeX"** or **"XeLaTeX"**
- Recompile

**Error: "Undefined control sequence \\toprule"**
- Your LaTeX distribution might be old
- In Overleaf settings, ensure **TeX Live version is 2023 or later**

**Error: Missing figures**
- This is EXPECTED - paper has placeholder figure references
- See "Step 5" below to add figures

## Step 5: Replace Placeholders

The paper has several placeholders you MUST replace with real data:

### A. Author Information (Line 49-55)
```latex
% REPLACE THIS:
\IEEEauthorblockN{Author Name\IEEEauthorrefmark{1}, Co-Author Name\IEEEauthorrefmark{2}}
\IEEEauthorblockA{\IEEEauthorrefmark{1}Department of Computer Science,
University Name, City, Country\\
Email: author@university.edu}

% WITH YOUR ACTUAL INFO:
\IEEEauthorblockN{John Doe\IEEEauthorrefmark{1}, Jane Smith\IEEEauthorrefmark{2}}
\IEEEauthorblockA{\IEEEauthorrefmark{1}Department of Computer Science,
Stanford University, California, USA\\
Email: jdoe@stanford.edu}
```

### B. Contract Address (Line 665)
```latex
% REPLACE THIS:
0x[ADDRESS_PLACEHOLDER_REPLACE_WITH_REAL]

% WITH YOUR SEPOLIA CONTRACT ADDRESS:
0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

### C. IRB Protocol Number (Line 707)
```latex
% REPLACE THIS:
IRB approval obtained (Protocol #2024-CS-782).

% WITH YOUR ACTUAL IRB OR REMOVE IF NOT APPLICABLE:
IRB approval obtained (Protocol #2025-CS-1234).
// OR remove the sentence if you don't have IRB approval
```

### D. Funding Acknowledgment (Line 1406)
```latex
% REPLACE THIS:
This research was supported by [Funding Agency/Grant Number - REPLACE].

% WITH ACTUAL FUNDING OR REMOVE:
This research was supported by NSF Grant #1234567.
// OR: This research received no external funding.
```

### E. Figure Placeholders

The paper references figures that DON'T exist yet. You need to:

**Option 1: Create actual figures**
- Use Draw.io, PowerPoint, or similar to create diagrams
- Export as PDF or PNG
- Upload to Overleaf (Upload icon → select files)
- Uncomment figure code blocks in the paper

**Option 2: Comment out figure references** (temporary)
```latex
% Find lines like:
Figure \ref{fig:gas_comparison} shows...

% Change to:
% Figure \ref{fig:gas_comparison} shows...
Our analysis shows...
```

## Step 6: Add Real Experimental Data

**CRITICAL:** The paper currently has template/expected values. You MUST replace with YOUR actual data:

### Where to add real data:

1. **Abstract (lines 58-68)**: Replace percentage values with your measurements
   ```latex
   % CHANGE:
   reduces unnecessary data exposure by 68.4\% for pharmacy access
   % TO YOUR ACTUAL DATA:
   reduces unnecessary data exposure by 72.1\% for pharmacy access
   ```

2. **Table II (lines 824-839)**: Replace with your transaction gas costs
   ```latex
   % Go to Etherscan Sepolia
   % Find your transactions
   % Record actual gas used
   % Calculate mean, std dev, min, max
   ```

3. **Section VI Results (lines 703-899)**: 
   - Replace all "127 participants" with your actual count
   - Replace "1,247 transactions" with your actual count
   - Update all statistical values (means, standard deviations, p-values)

### How to get real data:

```bash
# If you deployed on Sepolia testnet:
# 1. Go to https://sepolia.etherscan.io/
# 2. Search your contract address
# 3. Click "Transactions" tab
# 4. Export CSV
# 5. Calculate statistics in Excel/Python

# Python example:
import pandas as pd
import numpy as np

df = pd.read_csv('transactions.csv')
gas_values = df['GasUsed'].values

print(f"Mean: {np.mean(gas_values):.0f}")
print(f"Std Dev: {np.std(gas_values):.0f}")
print(f"Min: {np.min(gas_values)}")
print(f"Max: {np.max(gas_values)}")
```

## Step 7: Add Bibliography Entries

The paper currently has ~26 references. Add more to reach 30-40:

1. Search Google Scholar for: "blockchain healthcare 2023"
2. Click "Cite" → "BibTeX"
3. Convert to IEEE format:

```latex
\bibitem{newpaper2023}
A. Author and B. Author, ``Title of paper,'' 
\textit{Journal Name}, vol. X, no. Y, pp. Z-W, 2023.
```

4. Add at end of bibliography (before `\end{thebibliography}`)

### Recommended papers to add:
- Recent blockchain healthcare surveys (2023-2024)
- HIPAA compliance in blockchain systems
- Smart contract security audits
- IPFS performance studies
- Zero-knowledge proofs in healthcare

## Step 8: Generate PDF

Once you've replaced placeholders:

1. Click **"Recompile"** in Overleaf
2. Wait for compilation (may take 1-2 minutes)
3. Check PDF preview on right side
4. Download PDF: Click **"Download PDF"** icon (top right)

## Step 9: Check Paper Quality

Run these checks:

### A. Page Count
- IEEE conferences typically require 6-8 pages
- Check page count in PDF
- If over limit, reduce content
- If under limit, expand discussion/results

### B. References
- Count citations (should be 30-40)
- Ensure 60%+ are from 2020-2024
- Check for broken citations (shows as [?] in PDF)

### C. Figures and Tables
- Every figure/table should be referenced in text
- Every figure/table should have a caption
- Figures should be clear and readable

### D. Formatting
- Two-column layout: ✓
- IEEE font and spacing: ✓
- Section numbering correct: ✓
- No overfull hbox warnings: Check compilation log

## Step 10: Share and Collaborate

### To share with co-authors:

1. Click **"Share"** button (top right)
2. Two options:
   - **Turn on link sharing** (anyone with link can view/edit)
   - **Invite specific people** by email
3. Set permissions: View Only / Edit / Owner

### To export for submission:

Most IEEE conferences accept:
- **PDF** (primary format)
- **Source files** (LaTeX + figures as ZIP)

**Export source:**
1. Click project name (top left)
2. Download → **"Source"**
3. Gets ZIP file with all .tex and image files

## Step 11: Before Submission Checklist

- [ ] All placeholder text replaced (author names, addresses, contract address)
- [ ] Real experimental data added (not template values)
- [ ] 30-40 references cited
- [ ] All figures created and uploaded (or references commented out)
- [ ] Tables have real data
- [ ] Abstract updated with your actual results
- [ ] Author affiliations correct
- [ ] Funding acknowledgment updated
- [ ] PDF compiles without errors
- [ ] Page count within conference limits (usually 6-8 pages)
- [ ] Spell check completed (Overleaf has built-in spell checker)
- [ ] Grammar check completed (use Grammarly browser extension)
- [ ] Co-authors reviewed and approved
- [ ] Supplementary materials prepared (code repo, dataset)

## Troubleshooting

### "Package not found" errors:
```latex
% Add this to preamble (after \documentclass):
\usepackage{packages-name-here}

% Or remove the package if not critical
```

### Figures not displaying:
```latex
% Ensure you have:
\usepackage{graphicx}

% And figure path is correct:
\includegraphics[width=0.8\columnwidth]{figures/myimage.pdf}

% Upload images to Overleaf in "figures/" folder
```

### "Undefined reference" warnings:
- Click **"Recompile"** 2-3 times
- LaTeX needs multiple passes to resolve cross-references

### Text overflowing margins:
```latex
% For long URLs, use:
\url{https://very-long-url-here}

% For long code, reduce font:
\begin{small}
\begin{verbatim}
code here
\end{verbatim}
\end{small}
```

## Advanced: Create Figures in Overleaf

You can create simple figures directly in Overleaf using TikZ:

```latex
\begin{figure}[htbp]
\centering
\begin{tikzpicture}
\begin{axis}[
    ybar,
    ylabel={Gas Cost (thousands)},
    symbolic x coords={MediTrust, MedRec, HealthChain},
    xtick=data,
    width=0.9\columnwidth,
    height=5cm
]
\addplot coordinates {
    (MediTrust, 128)
    (MedRec, 152)
    (HealthChain, 165)
};
\end{axis}
\end{tikzpicture}
\caption{Gas cost comparison across systems}
\label{fig:gas_comparison}
\end{figure}
```

Add to preamble:
```latex
\usepackage{pgfplots}
\pgfplotsset{compat=1.18}
```

## Getting Help

1. **Overleaf Documentation**: https://www.overleaf.com/learn
2. **IEEE Author Center**: https://ieeeauthorcenter.ieee.org/
3. **LaTeX Stack Exchange**: https://tex.stackexchange.com/
4. **Overleaf Support**: Help button (bottom right in Overleaf)

## Quick Tips

- **Save often**: Overleaf auto-saves, but use History feature to restore versions
- **Use comments**: Right-click text → Add comment (for co-author discussions)
- **Track changes**: Overleaf has track changes feature (premium) or use \textcolor for edits
- **Version control**: Project menu → History → Download version at specific time

## IMPORTANT REMINDERS

⚠️ **YOU MUST REPLACE PLACEHOLDER DATA** with your actual experimental results. Reviewers will check for consistency and validity.

⚠️ **ADD MORE RECENT REFERENCES** (2023-2024) to show you're aware of latest research.

⚠️ **CREATE OR REMOVE FIGURE REFERENCES** - don't leave undefined figure references in final version.

⚠️ **RUN PLAGIARISM CHECK** - Use Turnitin, iThenticate, or Grammarly before submission.

⚠️ **GET CO-AUTHOR APPROVAL** - All authors must review and approve final version.

---

## Summary of Files

After setup, your Overleaf project should contain:
```
/
├── main.tex (your paper content)
├── figures/ (if you create figures)
│   ├── architecture.pdf
│   ├── gas_comparison.pdf
│   └── latency_distribution.pdf
└── IEEEtran.cls (automatically loaded by Overleaf)
```

**Good luck with your paper submission! 🎓**
