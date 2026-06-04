import React from 'react';
import { A4_LANDSCAPE_WIDTH_PX, EXPORT_SHEET_PADDING } from '../utils/exportSheet.js';

const COURSE_NAMES = {
  "CSE 1102": "Structured Programming Language",
  "CSE 1157": "Structured Programming Language Lab",
  "CSE 1205": "Electrical Engineering and Circuit Analysis",
  "CSE 1258": "Discrete Mathematics",
  "CSE 1259": "Electrical Engineering and Circuit Analysis Lab",
  "CSE 1290": "Software Development I",
  "CSE 1307": "Object-Oriented Programming I (C++)",
  "CSE 1360": "Object-Oriented Programming Lab",
  "ENG 1204": "English II (Advanced)",
  "MATH 1101": "Mathematics I (Differential Calculus and Integral Calculus)",
  "MATH 1302": "Mathematics II",
  "PHY 1302": "Physics II (Electromagnetism, Optics, and Modern Physics)",
  
  "CSE 2109": "Electronic Engineering",
  "CSE 2111": "Data Structures",
  "CSE 2161": "Electronic Engineering Lab Work",
  "CSE 2162": "Data Structure Lab Work",
  "CSE 2215": "Digital Logic Design",
  "CSE 2263": "Algorithm Design and Analysis",
  "CSE 2264": "Algorithms Lab Work",
  "CSE 2265": "Digital Logic Design Lab Work",
  "CSE 2291": "Software Development II (Database Programming)",
  "CSE 2317": "Digital Electronics & Pulse Technique",
  "CSE 2319": "Database Management System",
  "CSE 2366": "Digital Electronics & Pulse Technique Lab Works",
  "CSE 2367": "Database Management Systems Lab Work",
  "MATH 2103": "Mathematics III (Matrices, Vectors & Coordinate Geometry)",
  "MATH 2204": "Mathematics IV (Complex Variable & Laplace Transformation)",
  "MATH 2305": "Mathematics V (Statistics and Probability)",

  "CSE 3124": "Microprocessor and Assembly Language Programming",
  "CSE 3168": "Numerical Methods",
  "CSE 3169": "Theory of Computation",
  "CSE 3170": "Computer Architecture",
  "CSE 3171": "Microprocessor and Assembly Language Programming Lab Work",
  "CSE 3186": "Numerical Methods Lab Work",
  "CSE 3226": "Digital Image Processing",
  "CSE 3227": "Data Communication",
  "CSE 3228": "Compiler Design",
  "CSE 3230": "Software Engineering",
  "CSE 3272": "Compiler Design Lab Work",
  "CSE 3292": "Software Development III (Web Programming)",
  "CSE 3331": "Operating System",
  "CSE 3333": "Object-Oriented Programming II (Java)",
  "CSE 3373": "Operating System Lab Work",
  "CSE 3374": "Object-Oriented Programming II Lab Work (Java)",
  "CSE 3375": "Communication Engineering",

  "CSE 4136": "Computer Networks",
  "CSE 4176": "Computer Networks Lab Work",
  "CSE 4138": "Computer Peripherals and Interfacing",
  "CSE 4177": "Computer Peripherals and Interfacing Lab Work",
  "CSE 4241": "VLSI Design",
  "CSE 4279": "VLSI Design Lab Work",
  "CSE 4278": "Computer Graphics and Multimedia System Design",
  "CSE 4288": "Computer Graphics Lab Work",
  "CSE 4349": "Management Information System",
  "CSE 4351": "Image Processing & Computer Vision",
  "CSE 4383": "Image Processing & Computer Vision Lab Work",
  "CSE 4355": "Artificial Intelligence and Expert Systems",
  "CSE 4385": "Artificial Intelligence and Expert Systems Lab Work",
  "IPE 4101": "Industrial Management"
};

const BORDER = '1px solid #475569';
const HEADER_BG = '#bae6fd';
const TABLE_HEAD_BG = '#e2e8f0';

const thShell = (extra = {}) => ({
  border: BORDER,
  backgroundColor: TABLE_HEAD_BG,
  verticalAlign: 'middle',
  textAlign: 'center',
  padding: 0,
  height: '1px',
  ...extra,
});

const tdShell = (extra = {}) => ({
  border: BORDER,
  verticalAlign: 'middle',
  textAlign: 'center',
  padding: 0,
  height: '1px',
  ...extra,
});

/** html2canvas ignores flex alignItems; use table-cell vertical-align instead. */
const cellInnerWrap = (extra = {}) => ({
  display: 'table',
  width: '100%',
  minHeight: extra.minHeight || '36px',
  height: '100%',
});

const cellInnerContent = (align = 'center', extra = {}) => ({
  display: 'table-cell',
  verticalAlign: 'middle',
  textAlign: align,
  paddingTop: '10px',
  paddingBottom: '10px',
  paddingLeft: extra.paddingLeft || '5px',
  paddingRight: extra.paddingRight || '5px',
  boxSizing: 'border-box',
  lineHeight: '1.35',
  wordBreak: 'break-word',
  fontSize: extra.fontSize,
  fontWeight: extra.fontWeight,
  color: extra.color,
});

function CenterCell({ as = 'td', align = 'center', shellExtra = {}, innerExtra = {}, children }) {
  const Tag = as;
  const shell = as === 'th' ? thShell(shellExtra) : tdShell(shellExtra);
  return (
    <Tag style={shell}>
      <div style={cellInnerWrap(innerExtra)}>
        <div className="routine-cell-inner" style={cellInnerContent(align, innerExtra)}>{children}</div>
      </div>
    </Tag>
  );
}

export default function RoutineDownloadLayout({
  routine,
  selectedGroup,
  title,
  season,
  oddDates,
  evenDates,
  forExport = false,
}) {
  if (!routine || routine.length === 0) return null;

  const rootId = forExport ? 'routine-print-sheet' : undefined;
  const mainTableId = forExport ? 'routine-main-table' : undefined;
  const oddTableId = forExport ? 'routine-odd-table' : undefined;
  const instTableId = forExport ? 'routine-inst-table' : undefined;
  const evenTableId = forExport ? 'routine-even-table' : undefined;

  const instructors = [];
  const seenAcro = new Set();
  
  routine.forEach(entry => {
    const teacher = entry.teacher;
    if (teacher && teacher.name && teacher.name !== "TBA" && !seenAcro.has(entry.teacher_acro)) {
      seenAcro.add(entry.teacher_acro);
      instructors.push({
        acronym: entry.teacher_acro,
        name: teacher.name === entry.teacher_acro ? "" : teacher.name,
        designation: teacher.designation || "",
        department: teacher.department || "",
        mobile: teacher.mobile || ""
      });
    }
  });

  if (instructors.length === 0) {
    instructors.push({
      acronym: "TBA",
      name: "To Be Announced",
      designation: "",
      department: "",
      mobile: ""
    });
  }

  // Sort routine so Online classes appear at the end
  const sortedRoutine = [...routine].sort((a, b) => {
    const aIsOnline = a.room.toLowerCase() === 'online';
    const bIsOnline = b.room.toLowerCase() === 'online';
    if (aIsOnline && !bIsOnline) return 1;
    if (!aIsOnline && bIsOnline) return -1;
    return 0;
  });

  const getDayNotes = (entry) => {
    if (entry.room.toLowerCase() === "online") return `${entry.day} (Online)`;
    if (entry.odd_even === "odd") return "Odd Weeks Only";
    if (entry.odd_even === "even") return "Even Weeks Only";
    return entry.week_note || "";
  };

  const formatMobile = (mobile) => {
    if (mobile == null || mobile === '') return '';
    const text = String(mobile).trim();
    return text.endsWith('.0') ? text.slice(0, -2) : text;
  };

  const getRowBgColor = (entry) => {
    if (entry.room.toLowerCase() === "online") return "#F3E8FF";
    if (entry.odd_even === "odd") return "#FFF8DC";
    if (entry.odd_even === "even") return "#E8F4FD";
    return "#FFFFFF";
  };

  return (
    <div
      id={rootId}
      data-routine-sheet="true"
      style={{
        width: `${A4_LANDSCAPE_WIDTH_PX}px`,
        padding: EXPORT_SHEET_PADDING,
        backgroundColor: '#ffffff',
        color: '#000000',
        fontFamily: 'Arial, Helvetica, sans-serif',
        lineHeight: 'normal',
        boxSizing: 'border-box',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', marginTop: '16px' }}>
        <tbody>
          <tr>
            <CenterCell
              shellExtra={{
                backgroundColor: HEADER_BG,
                border: '2px solid #64748b',
                fontWeight: 'bold',
              }}
              innerExtra={{ minHeight: '44px', fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}
            >
              NUB - ECSE - SECTION {selectedGroup.toUpperCase()} {season ? `(${season}) ` : ''}CLASS ROUTINE
            </CenterCell>
          </tr>
        </tbody>
      </table>

      <table
        id={mainTableId}
        style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #475569', marginBottom: '24px', tableLayout: 'fixed' }}
      >
        <thead>
          <tr>
            <CenterCell as="th" shellExtra={{ width: '5%' }} innerExtra={{ fontSize: '13px', fontWeight: 'bold' }}>S.L</CenterCell>
            <CenterCell as="th" shellExtra={{ width: '18%' }} innerExtra={{ fontSize: '13px', fontWeight: 'bold' }}>Time</CenterCell>
            <CenterCell as="th" shellExtra={{ width: '8%' }} innerExtra={{ fontSize: '12px', fontWeight: 'bold' }}>Room</CenterCell>
            <CenterCell as="th" shellExtra={{ width: '10%' }} innerExtra={{ fontSize: '12px', fontWeight: 'bold' }}>Instructor</CenterCell>
            <CenterCell as="th" shellExtra={{ width: '10%' }} innerExtra={{ fontSize: '13px', fontWeight: 'bold' }}>Course</CenterCell>
            <CenterCell as="th" align="left" shellExtra={{ width: '35%' }} innerExtra={{ fontSize: '13px', fontWeight: 'bold', paddingLeft: '10px' }}>Subject Name</CenterCell>
            <CenterCell as="th" align="left" shellExtra={{ width: '14%' }} innerExtra={{ fontSize: '12px', fontWeight: 'bold', paddingLeft: '8px' }}>Day Notes</CenterCell>
          </tr>
        </thead>
        <tbody>
          {sortedRoutine.map((entry, index) => {
            const subjectName = COURSE_NAMES[entry.course] || entry.course;
            return (
              <tr key={index} style={{ backgroundColor: getRowBgColor(entry) }}>
                <CenterCell shellExtra={{ backgroundColor: getRowBgColor(entry) }} innerExtra={{ fontSize: '12px' }}>{index + 1}</CenterCell>
                <CenterCell shellExtra={{ backgroundColor: getRowBgColor(entry) }} innerExtra={{ fontSize: '13px' }}>{entry.start_time} – {entry.end_time}</CenterCell>
                <CenterCell shellExtra={{ backgroundColor: getRowBgColor(entry) }} innerExtra={{ fontSize: '12px' }}>{entry.room}</CenterCell>
                <CenterCell shellExtra={{ backgroundColor: getRowBgColor(entry) }} innerExtra={{ fontSize: '12px' }}>{entry.teacher_acro || 'TBA'}</CenterCell>
                <CenterCell shellExtra={{ backgroundColor: getRowBgColor(entry) }} innerExtra={{ fontSize: '13px', fontWeight: 'bold' }}>{entry.course}</CenterCell>
                <CenterCell align="left" shellExtra={{ backgroundColor: getRowBgColor(entry) }} innerExtra={{ fontSize: '13px', paddingLeft: '10px' }}>{subjectName}</CenterCell>
                <CenterCell align="left" shellExtra={{ backgroundColor: getRowBgColor(entry) }} innerExtra={{ fontSize: '12px', paddingLeft: '8px' }}>{getDayNotes(entry)}</CenterCell>
              </tr>
            );
          })}
        </tbody>
      </table>

      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <tbody>
          <tr style={{ verticalAlign: 'top' }}>
            <td style={{ width: '20%', verticalAlign: 'top', paddingRight: '8px' }}>
              <table id={oddTableId} style={{ width: '100%', borderCollapse: 'collapse', border: BORDER }}>
                <thead>
                  <tr>
                    <CenterCell as="th" shellExtra={{ width: '40px' }} innerExtra={{ fontSize: '13px', fontWeight: 'bold' }}>S.L</CenterCell>
                    <CenterCell as="th" innerExtra={{ fontSize: '13px', fontWeight: 'bold' }}>Odd Week</CenterCell>
                  </tr>
                </thead>
                <tbody>
                  {Array(8).fill(null).map((_, i) => (
                    <tr key={i} style={{ backgroundColor: '#ffffff' }}>
                      <CenterCell shellExtra={{ backgroundColor: '#ffffff' }} innerExtra={{ fontSize: '12px' }}>{i * 2 + 1}</CenterCell>
                      <CenterCell shellExtra={{ backgroundColor: '#ffffff' }} innerExtra={{ fontSize: '12px' }}>{(oddDates && oddDates[i]) || ''}</CenterCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </td>

            <td style={{ width: '60%', verticalAlign: 'top', padding: '0 8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #475569' }}>
                <tbody>
                  <tr>
                    <CenterCell
                      shellExtra={{
                        backgroundColor: HEADER_BG,
                        border: 'none',
                        borderBottom: BORDER,
                      }}
                      innerExtra={{ minHeight: '40px', fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}
                    >
                      NUB - ECSE - SECTION {selectedGroup.toUpperCase()} INSTRUCTOR LIST
                    </CenterCell>
                  </tr>
                </tbody>
              </table>
              <table id={instTableId} style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <CenterCell as="th" shellExtra={{ width: '6%' }} innerExtra={{ fontSize: '13px', fontWeight: 'bold' }}>S.L</CenterCell>
                    <CenterCell as="th" shellExtra={{ width: '12%' }} innerExtra={{ fontSize: '13px', fontWeight: 'bold' }}>Acro.</CenterCell>
                    <CenterCell as="th" align="left" shellExtra={{ width: '30%' }} innerExtra={{ fontSize: '13px', fontWeight: 'bold', paddingLeft: '8px' }}>Name</CenterCell>
                    <CenterCell as="th" align="left" shellExtra={{ width: '22%' }} innerExtra={{ fontSize: '13px', fontWeight: 'bold', paddingLeft: '8px' }}>Designation</CenterCell>
                    <CenterCell as="th" shellExtra={{ width: '10%' }} innerExtra={{ fontSize: '13px', fontWeight: 'bold' }}>Dept.</CenterCell>
                    <CenterCell as="th" shellExtra={{ width: '20%' }} innerExtra={{ fontSize: '13px', fontWeight: 'bold' }}>Mobile Number</CenterCell>
                  </tr>
                </thead>
                <tbody>
                  {instructors.map((inst, idx) => (
                    <tr key={idx} style={{ backgroundColor: '#ffffff' }}>
                      <CenterCell shellExtra={{ backgroundColor: '#ffffff' }} innerExtra={{ fontSize: '12px' }}>{idx + 1}</CenterCell>
                      <CenterCell shellExtra={{ backgroundColor: '#ffffff' }} innerExtra={{ fontSize: '12px' }}>{inst.acronym}</CenterCell>
                      <CenterCell align="left" shellExtra={{ backgroundColor: '#ffffff' }} innerExtra={{ fontSize: '12px', paddingLeft: '8px' }}>{inst.name}</CenterCell>
                      <CenterCell align="left" shellExtra={{ backgroundColor: '#ffffff' }} innerExtra={{ fontSize: '12px', paddingLeft: '8px' }}>{inst.designation}</CenterCell>
                      <CenterCell shellExtra={{ backgroundColor: '#ffffff' }} innerExtra={{ fontSize: '12px' }}>{inst.department}</CenterCell>
                      <CenterCell shellExtra={{ backgroundColor: '#ffffff' }} innerExtra={{ fontSize: '12px' }}>{formatMobile(inst.mobile)}</CenterCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </td>

            <td style={{ width: '20%', verticalAlign: 'top', paddingLeft: '8px' }}>
              <table id={evenTableId} style={{ width: '100%', borderCollapse: 'collapse', border: BORDER }}>
                <thead>
                  <tr>
                    <CenterCell as="th" shellExtra={{ width: '40px' }} innerExtra={{ fontSize: '13px', fontWeight: 'bold' }}>S.L</CenterCell>
                    <CenterCell as="th" innerExtra={{ fontSize: '13px', fontWeight: 'bold' }}>Even Week</CenterCell>
                  </tr>
                </thead>
                <tbody>
                  {Array(8).fill(null).map((_, i) => (
                    <tr key={i} style={{ backgroundColor: '#ffffff' }}>
                      <CenterCell shellExtra={{ backgroundColor: '#ffffff' }} innerExtra={{ fontSize: '12px' }}>{(i + 1) * 2}</CenterCell>
                      <CenterCell shellExtra={{ backgroundColor: '#ffffff' }} innerExtra={{ fontSize: '12px' }}>{(evenDates && evenDates[i]) || ''}</CenterCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
