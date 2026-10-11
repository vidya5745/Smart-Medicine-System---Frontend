import React, { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:8080";

function App() {
  // ============================================================
  // LOGIN / ROLE
  // ============================================================
  const [selectedRole, setSelectedRole] = useState(null);
  const [user, setUser] = useState(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);

  // ============================================================
  // PATIENT MEDICINES
  // ============================================================
  const [medicines, setMedicines] = useState([]);

  // ============================================================
  // DOCTOR PATIENTS
  // ============================================================
  const [patients, setPatients] = useState([]);

  // Medicines for each patient on doctor page
  const [doctorMedicines, setDoctorMedicines] = useState({});

  // Selected patient for Add Medicine modal
  const [selectedPatient, setSelectedPatient] = useState(null);

  // ============================================================
  // ADD MEDICINE FORM
  // ============================================================
  const [medicineName, setMedicineName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [prescribedTime, setPrescribedTime] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [medicineError, setMedicineError] = useState("");
  const [medicineSuccess, setMedicineSuccess] = useState("");

  // ============================================================
  // REMINDER POPUP
  // ============================================================
  const [reminderMedicine, setReminderMedicine] = useState(null);

  // Prevent same medicine popup from appearing repeatedly
  // on the same day
  const [shownReminders, setShownReminders] = useState([]);

  // ============================================================
  // GO BACK
  // ============================================================
  function goBack() {
    setSelectedRole(null);
    setEmail("");
    setPassword("");
    setLoginError("");
  }

  // ============================================================
  // LOGIN
  // ============================================================
  async function handleLogin(event) {
    event.preventDefault();

    setLoginError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          password: password,
          role: selectedRole,
        }),
      });

      if (!response.ok) {
        let message = "Invalid email or password.";

        try {
          const errorData = await response.json();

          if (errorData.message) {
            message = errorData.message;
          }
        } catch {
          // Ignore JSON parsing error
        }

        setLoginError(message);
        setLoading(false);
        return;
      }

      const data = await response.json();

      const loggedInUser = {
        ...data,
        role: data.role || selectedRole,
      };

      setUser(loggedInUser);

      setEmail("");
      setPassword("");
      setLoginError("");
    } catch (error) {
      console.error(error);
      setLoginError("Unable to connect to backend.");
    }

    setLoading(false);
  }

  // ============================================================
  // LOGOUT
  // ============================================================
  function handleLogout() {
    setUser(null);
    setSelectedRole(null);

    setMedicines([]);
    setPatients([]);
    setDoctorMedicines({});
    setSelectedPatient(null);

    setReminderMedicine(null);
    setShownReminders([]);

    setEmail("");
    setPassword("");
    setLoginError("");
  }

  // ============================================================
  // GET PATIENT MEDICINES
  // ============================================================
  async function loadMedicines(userId) {
    try {
      const response = await fetch(
        `${API_URL}/api/medicines?userId=${userId}`
      );

      if (!response.ok) {
        throw new Error("Unable to get medicines");
      }

      const data = await response.json();

      setMedicines(data);
    } catch (error) {
      console.error("Medicine loading error:", error);
      setMedicines([]);
    }
  }

  // ============================================================
  // LOAD PATIENT MEDICINES AFTER PATIENT LOGIN
  // ============================================================
  useEffect(() => {
    if (!user) {
      return;
    }

    if (user.role !== "PATIENT") {
      return;
    }

    loadMedicines(user.id);
  }, [user]);

  // ============================================================
  // GET DOCTOR PATIENTS
  // ============================================================
  async function loadPatients(doctorId) {
    try {
      const response = await fetch(
        `${API_URL}/api/doctors/${doctorId}/patients`
      );

      if (!response.ok) {
        throw new Error("Unable to get patients");
      }

      const data = await response.json();

      setPatients(data);

      // Load medicines for every patient
      for (const patient of data) {
        loadDoctorPatientMedicines(patient.id);
      }
    } catch (error) {
      console.error("Patient loading error:", error);
      setPatients([]);
    }
  }

  // ============================================================
  // LOAD MEDICINES FOR ONE PATIENT - DOCTOR
  // ============================================================
  async function loadDoctorPatientMedicines(patientId) {
    try {
      const response = await fetch(
        `${API_URL}/api/medicines?userId=${patientId}`
      );

      if (!response.ok) {
        throw new Error("Unable to get patient medicines");
      }

      const data = await response.json();

      setDoctorMedicines((previous) => ({
        ...previous,
        [patientId]: data,
      }));
    } catch (error) {
      console.error(
        "Doctor medicine loading error:",
        error
      );

      setDoctorMedicines((previous) => ({
        ...previous,
        [patientId]: [],
      }));
    }
  }

  // ============================================================
  // LOAD PATIENTS AFTER DOCTOR LOGIN
  // ============================================================
  useEffect(() => {
    if (!user) {
      return;
    }

    if (user.role !== "DOCTOR") {
      return;
    }

    loadPatients(user.id);
  }, [user]);

  // ============================================================
  // REFRESH DOCTOR MEDICINE STATUS
  //
  // This allows the doctor page to see TAKEN / MISSED updates.
  // ============================================================
  useEffect(() => {
    if (!user || user.role !== "DOCTOR") {
      return;
    }

    if (patients.length === 0) {
      return;
    }

    async function refreshDoctorMedicines() {
      for (const patient of patients) {
        await loadDoctorPatientMedicines(patient.id);
      }
    }

    refreshDoctorMedicines();

    const interval = setInterval(() => {
      refreshDoctorMedicines();
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [user, patients]);

  // ============================================================
  // GET LOCAL DATE
  // ============================================================
  function getLocalDate() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  // ============================================================
  // GET CURRENT LOCAL TIME IN MINUTES
  // ============================================================
  function getCurrentTimeInMinutes() {
    const now = new Date();

    return now.getHours() * 60 + now.getMinutes();
  }

  // ============================================================
  // CONVERT MEDICINE TIME TO MINUTES
  // ============================================================
  function getMedicineTimeInMinutes(time) {
    if (!time) {
      return null;
    }

    const parts = time.substring(0, 5).split(":");

    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);

    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes)
    ) {
      return null;
    }

    return hours * 60 + minutes;
  }

  // ============================================================
  // PATIENT REMINDER + MISSED CHECK
  //
  // At prescribed time:
  //       POPUP
  //
  // One minute after prescribed time:
  //       MISSED
  //
  // Then patient gets DELETE button.
  // ============================================================
  useEffect(() => {
    if (!user || user.role !== "PATIENT") {
      return;
    }

    if (medicines.length === 0) {
      return;
    }

    let cancelled = false;

    async function checkMedicineTimes() {
      const today = getLocalDate();
      const currentMinutes = getCurrentTimeInMinutes();

      for (const medicine of medicines) {
        if (cancelled) {
          return;
        }

        // Already taken
        if (medicine.status === "TAKEN") {
          continue;
        }

        // Already missed
        if (medicine.status === "MISSED") {
          continue;
        }

        // No prescribed time
        if (!medicine.prescribedTime) {
          continue;
        }

        // Medicine has not started yet
        if (
          medicine.startDate &&
          medicine.startDate > today
        ) {
          continue;
        }

        // Medicine date is finished
        if (
          medicine.endDate &&
          medicine.endDate < today
        ) {
          await markMedicineMissedAutomatically(
            medicine.id
          );

          continue;
        }

        const medicineMinutes =
          getMedicineTimeInMinutes(
            medicine.prescribedTime
          );

        if (medicineMinutes === null) {
          continue;
        }

        const reminderKey =
          `${medicine.id}-${today}`;

        // ======================================================
        // POPUP AT PRESCRIBED TIME
        // ======================================================
        if (
          medicine.status === "PENDING" &&
          currentMinutes === medicineMinutes
        ) {
          if (
            !shownReminders.includes(reminderKey)
          ) {
            setReminderMedicine(medicine);

            setShownReminders((previous) => {
              if (
                previous.includes(reminderKey)
              ) {
                return previous;
              }

              return [
                ...previous,
                reminderKey,
              ];
            });
          }
        }

        // ======================================================
        // AFTER PRESCRIBED TIME -> MISSED
        // ======================================================
        if (
          medicine.status === "PENDING" &&
          currentMinutes > medicineMinutes
        ) {
          await markMedicineMissedAutomatically(
            medicine.id
          );
        }
      }
    }

    checkMedicineTimes();

    // Check every 10 seconds
    const interval = setInterval(
      checkMedicineTimes,
      10000
    );

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user, medicines, shownReminders]);

  // ============================================================
  // AUTOMATICALLY MARK MISSED
  // ============================================================
  async function markMedicineMissedAutomatically(id) {
    try {
      const response = await fetch(
        `${API_URL}/api/medicines/${id}/missed`,
        {
          method: "PUT",
        }
      );

      if (!response.ok) {
        return;
      }

      const updatedMedicine =
        await response.json();

      setMedicines((previous) =>
        previous.map((medicine) =>
          medicine.id === id
            ? {
                ...medicine,
                ...updatedMedicine,
                status: "MISSED",
              }
            : medicine
        )
      );

      // Also close popup if this medicine became missed
      setReminderMedicine((previous) => {
        if (
          previous &&
          previous.id === id
        ) {
          return null;
        }

        return previous;
      });
    } catch (error) {
      console.error(
        "Unable to automatically mark medicine as missed:",
        error
      );
    }
  }

  // ============================================================
  // MARK MEDICINE AS TAKEN
  // ============================================================
  async function markMedicineTaken(id) {
    try {
      const response = await fetch(
        `${API_URL}/api/medicines/${id}/taken`,
        {
          method: "PUT",
        }
      );

      if (!response.ok) {
        alert(
          "Unable to mark medicine as taken."
        );
        return;
      }

      const updatedMedicine =
        await response.json();

      setMedicines((previous) =>
        previous.map((medicine) =>
          medicine.id === id
            ? {
                ...medicine,
                ...updatedMedicine,
                status: "TAKEN",
              }
            : medicine
        )
      );

      setReminderMedicine(null);
    } catch (error) {
      console.error(error);
      alert("Unable to connect to backend.");
    }
  }

  // ============================================================
  // MARK MEDICINE AS MISSED MANUALLY
  // ============================================================
  async function markMedicineMissed(id) {
    try {
      const response = await fetch(
        `${API_URL}/api/medicines/${id}/missed`,
        {
          method: "PUT",
        }
      );

      if (!response.ok) {
        alert(
          "Unable to mark medicine as missed."
        );
        return;
      }

      const updatedMedicine =
        await response.json();

      setMedicines((previous) =>
        previous.map((medicine) =>
          medicine.id === id
            ? {
                ...medicine,
                ...updatedMedicine,
                status: "MISSED",
              }
            : medicine
        )
      );

      setReminderMedicine(null);
    } catch (error) {
      console.error(error);
      alert("Unable to connect to backend.");
    }
  }

  // ============================================================
  // DELETE MEDICINE
  // ============================================================
  async function deleteMedicine(id) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this medicine?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/medicines/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        alert("Unable to delete medicine.");
        return;
      }

      setMedicines((previous) =>
        previous.filter(
          (medicine) => medicine.id !== id
        )
      );
    } catch (error) {
      console.error(error);
      alert("Unable to connect to backend.");
    }
  }

  // ============================================================
  // ADD MEDICINE FOR PATIENT - DOCTOR
  // ============================================================
  async function addMedicine(event) {
    event.preventDefault();

    setMedicineError("");
    setMedicineSuccess("");

    if (!selectedPatient) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/medicines?userId=${selectedPatient.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            medicineName: medicineName,
            dosage: dosage,
            frequency: frequency,
            prescribedTime: prescribedTime,
            startDate: startDate,
            endDate: endDate,
          }),
        }
      );

      if (!response.ok) {
        let message =
          "Unable to add medicine.";

        try {
          const errorData =
            await response.json();

          if (errorData.message) {
            message = errorData.message;
          }
        } catch {
          // Ignore
        }

        setMedicineError(message);
        return;
      }

      setMedicineSuccess(
        "Medicine added successfully."
      );

      // Reload medicines for this patient
      await loadDoctorPatientMedicines(
        selectedPatient.id
      );

      // Clear form
      setMedicineName("");
      setDosage("");
      setFrequency("");
      setPrescribedTime("");
      setStartDate("");
      setEndDate("");

      // Close modal after short delay
      setTimeout(() => {
        setSelectedPatient(null);
        setMedicineSuccess("");
      }, 1000);
    } catch (error) {
      console.error(error);
      setMedicineError(
        "Unable to connect to backend."
      );
    }
  }

  // ============================================================
  // OPEN ADD MEDICINE
  // ============================================================
  function openAddMedicine(patient) {
    setSelectedPatient(patient);

    setMedicineName("");
    setDosage("");
    setFrequency("");
    setPrescribedTime("");
    setStartDate("");
    setEndDate("");

    setMedicineError("");
    setMedicineSuccess("");
  }

  // ============================================================
  // CLOSE ADD MEDICINE
  // ============================================================
  function closeAddMedicine() {
    setSelectedPatient(null);

    setMedicineName("");
    setDosage("");
    setFrequency("");
    setPrescribedTime("");
    setStartDate("");
    setEndDate("");

    setMedicineError("");
    setMedicineSuccess("");
  }

  // ============================================================
  // ACCOUNT SELECTION PAGE
  // ============================================================
  if (!selectedRole && !user) {
    return (
      <div
        className="app-container"
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div className="login-card">

          <h1>
            💊 Smart Medicine Reminder
          </h1>

          <p>Select your account</p>

          <button
            className="role-button"
            onClick={() =>
              setSelectedRole("PATIENT")
            }
          >
            👤 &nbsp; Patient Login
          </button>

          <button
            className="role-button"
            onClick={() =>
              setSelectedRole("DOCTOR")
            }
          >
            🧑‍⚕️ &nbsp; Doctor Login
          </button>

        </div>
      </div>
    );
  }

  // ============================================================
  // LOGIN PAGE
  // ============================================================
  if (!user) {
    return (
      <div
        className="app-container"
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div className="login-card">

          <button
            className="back-button"
            onClick={goBack}
          >
            ← Back
          </button>

          <div className="login-icon">
            {selectedRole === "PATIENT"
              ? "👤"
              : "🧑‍⚕️"}
          </div>

          <h1>
            {selectedRole === "PATIENT"
              ? "Patient Login"
              : "Doctor Login"}
          </h1>

          <p>
            {selectedRole === "PATIENT"
              ? "Manage your medicines"
              : "Manage your patients"}
          </p>

          <form onSubmit={handleLogin}>

            <label>Email</label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
            />

            <label>Password</label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
            />

            {loginError && (
              <p
                style={{
                  color: "red",
                  textAlign: "center",
                }}
              >
                {loginError}
              </p>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading
                ? "Logging in..."
                : "Login"}
            </button>

          </form>

        </div>
      </div>
    );
  }

  // ============================================================
  // PATIENT DASHBOARD
  // ============================================================
  if (user.role === "PATIENT") {
    return (
      <div className="dashboard-container">

        {/* HEADER */}
        <header className="dashboard-header">

          <div>
            <h1>
              💊 Smart Medicine Reminder
            </h1>

            <p>
              Welcome, {user.name}
            </p>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>

        </header>

        {/* PATIENT MEDICINES */}
        <main className="dashboard-content">

          <h2>My Medicines</h2>

          {medicines.length === 0 ? (
            <p>No medicines found.</p>
          ) : (
            <div className="medicine-list">

              {medicines.map((medicine) => (
                <div
                  className="medicine-card"
                  key={medicine.id}
                >

                  <h3>
                    💊 {medicine.medicineName}
                  </h3>

                  <p>
                    <strong>
                      Dosage:
                    </strong>{" "}
                    {medicine.dosage}
                  </p>

                  <p>
                    <strong>
                      Frequency:
                    </strong>{" "}
                    {medicine.frequency}
                  </p>

                  <p>
                    <strong>
                      Time:
                    </strong>{" "}
                    {medicine.prescribedTime}
                  </p>

                  <p>
                    <strong>
                      Start Date:
                    </strong>{" "}
                    {medicine.startDate}
                  </p>

                  <p>
                    <strong>
                      End Date:
                    </strong>{" "}
                    {medicine.endDate}
                  </p>

                  {/* STATUS */}
                  <p>
                    <strong>
                      Status:
                    </strong>{" "}

                    <span
                      style={{
                        fontWeight: "bold",
                        color:
                          medicine.status ===
                          "TAKEN"
                            ? "green"
                            : medicine.status ===
                              "MISSED"
                            ? "red"
                            : "#e69500",
                      }}
                    >
                      {medicine.status}
                    </span>
                  </p>

                  {/* PENDING BUTTONS */}
                  {medicine.status ===
                    "PENDING" && (
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        marginTop: "15px",
                      }}
                    >

                      <button
                        onClick={() =>
                          markMedicineTaken(
                            medicine.id
                          )
                        }
                      >
                        Taken
                      </button>

                      <button
                        onClick={() =>
                          markMedicineMissed(
                            medicine.id
                          )
                        }
                      >
                        Missed
                      </button>

                    </div>
                  )}

                  {/* DELETE ONLY FOR MISSED */}
                  {medicine.status ===
                    "MISSED" && (
                    <button
                      onClick={() =>
                        deleteMedicine(
                          medicine.id
                        )
                      }
                      style={{
                        marginTop: "15px",
                      }}
                    >
                      Delete
                    </button>
                  )}

                </div>
              ))}

            </div>
          )}

        </main>

        {/* ====================================================
            REMINDER POPUP
        ==================================================== */}
        {reminderMedicine && (
          <div className="reminder-overlay">

            <div className="reminder-popup">

              <div className="reminder-icon">
                ⏰
              </div>

              <h2>
                Medicine Reminder
              </h2>

              <p className="reminder-message">
                It is time to take your medicine.
              </p>

              <div className="reminder-medicine">

                <h3>
                  💊{" "}
                  {reminderMedicine.medicineName}
                </h3>

                <p>
                  <strong>
                    Dosage:
                  </strong>{" "}
                  {reminderMedicine.dosage}
                </p>

                <p>
                  <strong>
                    Time:
                  </strong>{" "}
                  {reminderMedicine.prescribedTime}
                </p>

              </div>

              <button
                className="reminder-ok-button"
                onClick={() =>
                  setReminderMedicine(null)
                }
              >
                OK
              </button>

            </div>

          </div>
        )}

      </div>
    );
  }

  // ============================================================
  // DOCTOR DASHBOARD
  // ============================================================
  if (user.role === "DOCTOR") {
    return (
      <div className="dashboard-container">

        {/* HEADER */}
        <header className="dashboard-header">

          <div>
            <h1>
              💊 Smart Medicine Reminder
            </h1>

            <p>
              Welcome, Dr. {user.name}
            </p>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>

        </header>

        {/* DOCTOR PATIENTS */}
        <main className="dashboard-content">

          <h2>My Patients</h2>

          {patients.length === 0 ? (
            <p>
              No patients assigned.
            </p>
          ) : (
            <div className="patient-list">

              {patients.map((patient) => {

                const patientMedicines =
                  doctorMedicines[
                    patient.id
                  ] || [];

                return (
                  <div
                    className="patient-card"
                    key={patient.id}
                  >

                    <h3>
                      👤 {patient.name}
                    </h3>

                    <p>
                      <strong>
                        ID:
                      </strong>{" "}
                      {patient.id}
                    </p>

                    <p>
                      <strong>
                        Email:
                      </strong>{" "}
                      {patient.email}
                    </p>

                    {/* ADD MEDICINE */}
                    <button
                      className="add-medicine-button"
                      onClick={() =>
                        openAddMedicine(
                          patient
                        )
                      }
                    >
                      Add Medicine
                    </button>

                    {/* =================================================
                        DOCTOR CAN SEE PATIENT MEDICINES
                    ================================================= */}
                    <div
                      style={{
                        marginTop: "20px",
                      }}
                    >

                      <h4>
                        Medicines
                      </h4>

                      {patientMedicines.length ===
                      0 ? (
                        <p>
                          No medicines added.
                        </p>
                      ) : (
                        patientMedicines.map(
                          (medicine) => (
                            <div
                              className="medicine-card"
                              key={medicine.id}
                              style={{
                                marginTop:
                                  "10px",
                              }}
                            >

                              <h3>
                                💊{" "}
                                {
                                  medicine.medicineName
                                }
                              </h3>

                              <p>
                                <strong>
                                  Dosage:
                                </strong>{" "}
                                {
                                  medicine.dosage
                                }
                              </p>

                              <p>
                                <strong>
                                  Frequency:
                                </strong>{" "}
                                {
                                  medicine.frequency
                                }
                              </p>

                              <p>
                                <strong>
                                  Time:
                                </strong>{" "}
                                {
                                  medicine.prescribedTime
                                }
                              </p>

                              <p>
                                <strong>
                                  Start Date:
                                </strong>{" "}
                                {
                                  medicine.startDate
                                }
                              </p>

                              <p>
                                <strong>
                                  End Date:
                                </strong>{" "}
                                {
                                  medicine.endDate
                                }
                              </p>

                              <p>
                                <strong>
                                  Status:
                                </strong>{" "}

                                <span
                                  style={{
                                    fontWeight:
                                      "bold",
                                    color:
                                      medicine.status ===
                                      "TAKEN"
                                        ? "green"
                                        : medicine.status ===
                                          "MISSED"
                                        ? "red"
                                        : "#e69500",
                                  }}
                                >
                                  {
                                    medicine.status
                                  }
                                </span>
                              </p>

                            </div>
                          )
                        )
                      )}

                    </div>

                  </div>
                );
              })}

            </div>
          )}

        </main>

        {/* ====================================================
            ADD MEDICINE MODAL
        ==================================================== */}
        {selectedPatient && (
          <div className="modal-overlay">

            <div className="medicine-modal">

              <button
                onClick={closeAddMedicine}
                style={{
                  float: "right",
                  border: "none",
                  background: "transparent",
                  fontSize: "22px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>

              <h2>
                Add Medicine for Patient
              </h2>

              <p>
                Patient:{" "}
                <strong>
                  {selectedPatient.name}
                </strong>
              </p>

              <p>
                Patient ID:{" "}
                <strong>
                  {selectedPatient.id}
                </strong>
              </p>

              <form onSubmit={addMedicine}>

                <label>
                  Medicine Name
                </label>

                <input
                  type="text"
                  placeholder="Example: Dolo"
                  value={medicineName}
                  onChange={(event) =>
                    setMedicineName(
                      event.target.value
                    )
                  }
                  required
                />

                <label>
                  Dosage
                </label>

                <input
                  type="text"
                  placeholder="Example: 500mg"
                  value={dosage}
                  onChange={(event) =>
                    setDosage(
                      event.target.value
                    )
                  }
                  required
                />

                <label>
                  Frequency
                </label>

                <input
                  type="text"
                  placeholder="Example: once daily"
                  value={frequency}
                  onChange={(event) =>
                    setFrequency(
                      event.target.value
                    )
                  }
                  required
                />

                <label>
                  Prescribed Time
                </label>

                <input
                  type="time"
                  value={prescribedTime}
                  onChange={(event) =>
                    setPrescribedTime(
                      event.target.value
                    )
                  }
                  required
                />

                <label>
                  Start Date
                </label>

                <input
                  type="date"
                  value={startDate}
                  onChange={(event) =>
                    setStartDate(
                      event.target.value
                    )
                  }
                  required
                />

                <label>
                  End Date
                </label>

                <input
                  type="date"
                  value={endDate}
                  onChange={(event) =>
                    setEndDate(
                      event.target.value
                    )
                  }
                  required
                />

                {medicineError && (
                  <p
                    style={{
                      color: "red",
                      textAlign: "center",
                    }}
                  >
                    {medicineError}
                  </p>
                )}

                {medicineSuccess && (
                  <p
                    style={{
                      color: "green",
                      textAlign: "center",
                    }}
                  >
                    {medicineSuccess}
                  </p>
                )}

                <button
                  type="submit"
                  className="login-button"
                >
                  Add Medicine
                </button>

              </form>

            </div>

          </div>
        )}

      </div>
    );
  }

  return null;
}

export default App;