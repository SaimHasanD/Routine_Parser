import React from 'react';

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

const ODD_WEEK_DATES = [
  "10-Oct-25", "24-Oct-25", "07-Nov-25", "21-Nov-25",
  "05-Dec-25", "19-Dec-25", "02-Jan-26", "16-Jan-26"
];

const EVEN_WEEK_DATES = [
  "17-Oct-25", "31-Oct-25", "14-Nov-25", "28-Nov-25",
  "12-Dec-25", "26-Dec-25", "09-Jan-26", "23-Jan-26"
];

export function deduceBatch(group) {
  const match = group.match(/\d+/);
  if (match) {
    const num = parseInt(match[0]);
    return 58 - num;
  }
  return 56;
}

export default function RoutineDownloadLayout({ routine, selectedGroup }) {
  const batch = deduceBatch(selectedGroup);

  const instructors = [];
  const seenAcro = new Set();
  
  routine.forEach(entry => {
    const teacher = entry.teacher;
    if (teacher && teacher.name && teacher.name !== "TBA" && !seenAcro.has(entry.teacher_acro)) {
      seenAcro.add(entry.teacher_acro);
      instructors.push({
        acronym: entry.teacher_acro,
        name: teacher.name,
        designation: teacher.designation || "Lecturer",
        department: teacher.department || "CSE",
        mobile: teacher.mobile || "N/A"
      });
    }
  });

  if (instructors.length === 0) {
    instructors.push({
      acronym: "TBA",
      name: "To Be Announced",
      designation: "Lecturer",
      department: "CSE",
      mobile: "N/A"
    });
  }

  const getDayNotes = (entry) => {
    if (entry.room.toLowerCase() === "online") return `${entry.day} (Online)`;
    if (entry.odd_even === "odd") return "Odd Weeks Only";
    if (entry.odd_even === "even") return "Even Weeks Only";
    return entry.week_note || "";
  };

  const getRowBgColor = (entry) => {
    if (entry.room.toLowerCase() === "online") return "#F3E8FF";
    if (entry.odd_even === "odd") return "#FFF8DC";
    if (entry.odd_even === "even") return "#E8F4FD";
    return "#FFFFFF";
  };

  return (
    <div 
      id="routine-print-sheet" 
      className="bg-white text-black font-sans mx-auto box-border"
      style={{ 
        width: '1122px',
        padding: '15mm' 
      }}
    >
      <div className="bg-[#9cc2e5] border-2 border-slate-600 p-2 text-center mb-4">
        <h2 className="text-[16px] font-bold uppercase tracking-wide text-black m-0">
          NUB - ECSE Batch {batch} - Section {selectedGroup} Class Routine
        </h2>
      </div>

      <table id="routine-main-table" className="w-full border-collapse border-2 border-slate-600 mb-6 table-fixed">
        <thead>
          <tr className="bg-slate-200 text-black border-b border-slate-600">
            <th className="border border-slate-600 px-[5px] py-[10px] text-center" style={{ width: '5%', fontSize: '13px', fontWeight: 'bold' }}>S.L</th>
            <th className="border border-slate-600 px-[5px] py-[10px] text-center" style={{ width: '18%', fontSize: '13px', fontWeight: 'bold' }}>Time</th>
            <th className="border border-slate-600 px-[5px] py-[10px] text-center" style={{ width: '8%', fontSize: '12px', fontWeight: 'bold' }}>Room</th>
            <th className="border border-slate-600 px-[5px] py-[10px] text-center" style={{ width: '10%', fontSize: '12px', fontWeight: 'bold' }}>Instructor</th>
            <th className="border border-slate-600 px-[5px] py-[10px] text-center" style={{ width: '10%', fontSize: '13px', fontWeight: 'bold' }}>Course</th>
            <th className="border border-slate-600 px-[5px] py-[10px] text-left" style={{ width: '35%', fontSize: '13px', fontWeight: 'bold' }}>Subject Name</th>
            <th className="border border-slate-600 px-[5px] py-[10px] text-left" style={{ width: '14%', fontSize: '12px', fontWeight: 'bold' }}>Day Notes</th>
          </tr>
        </thead>
        <tbody>
          {routine.map((entry, index) => {
            const subjectName = COURSE_NAMES[entry.course] || entry.course;
            return (
              <tr key={index} style={{ backgroundColor: getRowBgColor(entry) }}>
                <td className="border border-slate-600 py-[5px] px-1 text-center" style={{ fontSize: '12px' }}>{index + 1}</td>
                <td className="border border-slate-600 py-[5px] px-1 text-center" style={{ fontSize: '13px' }}>{entry.start_time} – {entry.end_time}</td>
                <td className="border border-slate-600 py-[5px] px-1 text-center" style={{ fontSize: '12px' }}>{entry.room}</td>
                <td className="border border-slate-600 py-[5px] px-1 text-center" style={{ fontSize: '12px' }}>{entry.teacher_acro || "TBA"}</td>
                <td className="border border-slate-600 py-[5px] px-1 text-center" style={{ fontSize: '13px', fontWeight: 'bold' }}>{entry.course}</td>
                <td className="border border-slate-600 py-[5px] px-3 text-left" style={{ fontSize: '13px' }}>{subjectName}</td>
                <td className="border border-slate-600 py-[5px] px-2 text-left" style={{ fontSize: '12px' }}>{getDayNotes(entry)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="grid grid-cols-10 gap-4 items-start">
        <div className="col-span-2">
          <table id="routine-odd-table" className="w-full border-collapse border-2 border-slate-600">
            <thead>
              <tr className="border-b border-slate-600" style={{ backgroundColor: '#FFF8DC' }}>
                <th className="border border-slate-600 py-[5px] px-1 text-center" style={{ fontSize: '13px', fontWeight: 'bold', width: '15%' }}>S.L</th>
                <th className="border border-slate-600 py-[5px] px-1 text-center" style={{ fontSize: '13px', fontWeight: 'bold', width: '85%' }}>Odd Week</th>
              </tr>
            </thead>
            <tbody>
              {ODD_WEEK_DATES.map((date, idx) => (
                <tr key={idx} className="bg-white">
                  <td className="border border-slate-600 py-[5px] px-1 text-center" style={{ fontSize: '12px' }}>{idx * 2 + 1}</td>
                  <td className="border border-slate-600 py-[5px] px-1 text-center" style={{ fontSize: '12px' }}>{date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="col-span-6">
          <div className="border-2 border-slate-600">
            <div className="bg-[#9cc2e5] border-b border-slate-600 p-2 text-center">
              <h3 className="uppercase m-0 text-black" style={{ fontSize: '13px', fontWeight: 'bold' }}>
                NUB - ECSE Batch {batch} - Section {selectedGroup} Instructor List
              </h3>
            </div>
            <table id="routine-inst-table" className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-200 border-b border-slate-600">
                  <th className="border-r border-b border-slate-600 py-[5px] text-center" style={{ fontSize: '13px', fontWeight: 'bold', width: '6%' }}>S.L</th>
                  <th className="border-r border-b border-slate-600 py-[5px] text-center" style={{ fontSize: '13px', fontWeight: 'bold', width: '12%' }}>Acro.</th>
                  <th className="border-r border-b border-slate-600 py-[5px] text-left px-2" style={{ fontSize: '13px', fontWeight: 'bold', width: '30%' }}>Name</th>
                  <th className="border-r border-b border-slate-600 py-[5px] text-left px-2" style={{ fontSize: '13px', fontWeight: 'bold', width: '22%' }}>Designation</th>
                  <th className="border-r border-b border-slate-600 py-[5px] text-center" style={{ fontSize: '13px', fontWeight: 'bold', width: '10%' }}>Dept.</th>
                  <th className="border-b border-slate-600 py-[5px] text-center" style={{ fontSize: '13px', fontWeight: 'bold', width: '20%' }}>Mobile Number</th>
                </tr>
              </thead>
              <tbody>
                {instructors.map((inst, idx) => (
                  <tr key={idx} className="bg-white">
                    <td className="border-r border-b border-slate-600 py-[5px] px-1 text-center" style={{ fontSize: '12px' }}>{idx + 1}</td>
                    <td className="border-r border-b border-slate-600 py-[5px] px-1 text-center" style={{ fontSize: '12px' }}>{inst.acronym}</td>
                    <td className="border-r border-b border-slate-600 py-[5px] px-2 text-left" style={{ fontSize: '12px' }}>{inst.name}</td>
                    <td className="border-r border-b border-slate-600 py-[5px] px-2 text-left" style={{ fontSize: '12px' }}>{inst.designation}</td>
                    <td className="border-r border-b border-slate-600 py-[5px] px-1 text-center" style={{ fontSize: '12px' }}>{inst.department}</td>
                    <td className="border-b border-slate-600 py-[5px] px-1 text-center" style={{ fontSize: '12px' }}>{inst.mobile}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-span-2">
          <table id="routine-even-table" className="w-full border-collapse border-2 border-slate-600">
            <thead>
              <tr className="border-b border-slate-600" style={{ backgroundColor: '#E8F4FD' }}>
                <th className="border border-slate-600 py-[5px] px-1 text-center" style={{ fontSize: '13px', fontWeight: 'bold', width: '15%' }}>S.L</th>
                <th className="border border-slate-600 py-[5px] px-1 text-center" style={{ fontSize: '13px', fontWeight: 'bold', width: '85%' }}>Even Week</th>
              </tr>
            </thead>
            <tbody>
              {EVEN_WEEK_DATES.map((date, idx) => (
                <tr key={idx} className="bg-white">
                  <td className="border border-slate-600 py-[5px] px-1 text-center" style={{ fontSize: '12px' }}>{(idx + 1) * 2}</td>
                  <td className="border border-slate-600 py-[5px] px-1 text-center" style={{ fontSize: '12px' }}>{date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
