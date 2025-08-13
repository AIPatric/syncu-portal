import { useState } from 'react';
import { FaCheckCircle, FaTimesCircle, FaDownload, FaChevronDown, FaChevronUp, FaExclamationTriangle } from 'react-icons/fa';

export default function StatusTable({ data }) {
  const [expandedRows, setExpandedRows] = useState({});

  const toggleRow = (index) => {
    setExpandedRows((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-300 bg-white">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2 border">Kunde</th>
            <th className="p-2 border">Rolle</th>
            <th className="p-2 border">Dokument</th>
            <th className="p-2 border">Pflicht</th>
            <th className="p-2 border">Vorhanden</th>
            <th className="p-2 border">Mindestanzahl</th>
            <th className="p-2 border">Tiefergehende Prüfung</th>
            <th className="p-2 border">Download</th>
            <th className="p-2 border"></th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => {
            const istPflicht = row.erforderlich;
            const vorhanden = row.vorhanden;
            const mindestanzahlOk = row.mindestanzahl_erfüllt;
            const tiefergehend = row.tiefergehende_pruefung;

            return (
              <>
                <tr
                  key={index}
                  className={`${istPflicht && !vorhanden ? 'bg-red-50' : ''}`}
                >
                  <td className="p-2 border">{row.kunde_name}</td>
                  <td className="p-2 border">{row.kundenrolle}</td>
                  <td className="p-2 border">{row.dokument_name}</td>
                  <td className="p-2 border">
                    {istPflicht ? (
                      <FaCheckCircle className="text-blue-600 inline" />
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="p-2 border">
                    {vorhanden ? (
                      <FaCheckCircle className="text-green-600 inline" />
                    ) : (
                      <FaTimesCircle className="text-red-600 inline" />
                    )}
                  </td>
                  <td className="p-2 border">
                    {row.mindestanzahl ? (
                      mindestanzahlOk ? (
                        <FaCheckCircle className="text-green-600 inline" />
                      ) : (
                        <span className="flex items-center text-yellow-600">
                          <FaExclamationTriangle className="mr-1" /> {row.anzahl_vorhanden}/{row.mindestanzahl}
                        </span>
                      )
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="p-2 border">
                    {tiefergehend ? (
                      <span className="text-blue-600 font-semibold">Ja</span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="p-2 border text-center">
                    {row.file_url ? (
                      <a
                        href={row.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center justify-center"
                      >
                        <FaDownload className="mr-1" /> Download
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="p-2 border text-center">
                    {tiefergehend && row.case_typ ? (
                      <button
                        onClick={() => toggleRow(index)}
                        className="text-blue-600 hover:underline flex items-center"
                      >
                        {expandedRows[index] ? (
                          <>
                            <FaChevronUp className="mr-1" /> Details
                          </>
                        ) : (
                          <>
                            <FaChevronDown className="mr-1" /> Details
                          </>
                        )}
                      </button>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>

                {/* Dropdown-Zeile für tiefergehende Prüfung */}
                {expandedRows[index] && tiefergehend && row.case_typ && (
                  <tr>
                    <td colSpan="9" className="p-4 border bg-gray-50">
                      <div>
                        <p><strong>Case-Typ:</strong> {row.case_typ}</p>
                        <p><strong>Status:</strong> {row.case_status}</p>
                        <p><strong>Details:</strong> {JSON.stringify(row.case_details)}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
