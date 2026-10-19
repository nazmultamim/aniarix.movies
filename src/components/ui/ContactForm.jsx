"use client";

import { useState, useRef } from "react";
import emailjs from "@emailjs/browser";
import { Mail, Send, CheckCircle2, AlertCircle } from "lucide-react";

const ORANGE_FROM = "#FF8A3D";
const ORANGE_TO = "#FF3D1A";

export default function ContactForm() {
  const formRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | sending | success | error
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    emailjs
      .sendForm(
        process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID,
        process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID,
        formRef.current,
        process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
      )
      .then(() => {
        setStatus("success");
        formRef.current.reset();
      })
      .catch((err) => {
        console.error("EmailJS error:", err);
        setStatus("error");
        setErrorMsg("Something went wrong. Please try again in a moment.");
      });
  };

  return (
    <main
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: "#050507",
        padding: "1px 24px",
      }}
    >


      <div
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: 560,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 10 }}>

          <h1
            style={{
              marginTop: 1,
              fontSize: "clamp(1.5rem, 5vw, 3rem)",
              fontWeight: 900,
              color: "#fff",
              letterSpacing: "-0.02em",
            }}
          >
            Contact{" "} Us
          </h1>

          <p style={{ marginTop: 12, fontSize: 15, color: "rgba(255,255,255,0.5)" }}>
            Questions, requests, or found a broken link? Send us a message.
          </p>
        </div>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            backdropFilter: "blur(20px)",
            padding: 32,
          }}
        >
          <Field
            label="Email"
            name="from_email"
            type="email"
            placeholder="you@example.com"
            required
          />
          <Field
            label="Subject"
            name="subject"
            type="text"
            placeholder="What's this about?"
            required
          />
          <FieldTextarea
            label="Message"
            name="message"
            placeholder="Tell us more..."
            required
          />

          <button
            type="submit"
            disabled={status === "sending"}
            style={{
              marginTop: 8,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              borderRadius: 12,
              padding: "14px 28px",
              fontSize: 14,
              fontWeight: 700,
              color: "#000",
              border: "none",
              cursor: status === "sending" ? "not-allowed" : "pointer",
              opacity: status === "sending" ? 0.7 : 1,
              background: `linear-gradient(90deg, ${ORANGE_FROM}, ${ORANGE_TO})`,
              boxShadow: `0 8px 30px ${ORANGE_FROM}59`,
            }}
          >
            <Send size={16} />
            {status === "sending" ? "Sending..." : "Send Message"}
          </button>

          {status === "success" && (
            <StatusBanner
              icon={<CheckCircle2 size={16} />}
              text="Message sent — we'll get back to you soon."
              tone="success"
            />
          )}
          {status === "error" && (
            <StatusBanner
              icon={<AlertCircle size={16} />}
              text={errorMsg}
              tone="error"
            />
          )}
        </form>
      </div>
    </main>
  );
}

function Field({ label, name, type, placeholder, required }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
        {label}
      </span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        style={{
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(0,0,0,0.3)",
          padding: "12px 16px",
          fontSize: 14,
          color: "#fff",
          outline: "none",
        }}
      />
    </label>
  );
}

function FieldTextarea({ label, name, placeholder, required }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
        {label}
      </span>
      <textarea
        name={name}
        placeholder={placeholder}
        required={required}
        rows={5}
        style={{
          resize: "vertical",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(0,0,0,0.3)",
          padding: "12px 16px",
          fontSize: 14,
          color: "#fff",
          outline: "none",
          fontFamily: "inherit",
        }}
      />
    </label>
  );
}

function StatusBanner({ icon, text, tone }) {
  const colors =
    tone === "success"
      ? { border: "rgba(74,222,128,0.3)", bg: "rgba(74,222,128,0.1)", text: "#4ade80" }
      : { border: "rgba(248,113,113,0.3)", bg: "rgba(248,113,113,0.1)", text: "#f87171" };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        borderRadius: 10,
        border: `1px solid ${colors.border}`,
        background: colors.bg,
        padding: "10px 14px",
        fontSize: 13,
        color: colors.text,
      }}
    >
      {icon}
      {text}
    </div>
  );
}