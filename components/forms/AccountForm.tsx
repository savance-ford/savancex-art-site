"use client";

import { useToast } from "@/components/overlays/ToastProvider";

export function AccountForm() {
  const { showToast } = useToast();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    showToast("Login placeholder — no account service connected");
  }

  return (
    <form className="form-grid" data-form="account" onSubmit={handleSubmit}>
      <div className="field field--full">
        <label htmlFor="account-email">Email address</label>
        <input
          id="account-email"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
        />
      </div>
      <div className="field field--full">
        <label htmlFor="account-password">Password</label>
        <input
          id="account-password"
          name="password"
          type="password"
          required
          placeholder="••••••••"
        />
      </div>
      <div className="field field--full">
        <button className="btn btn--wide" type="submit">
          Log in
        </button>
      </div>
      <div className="field field--full">
        <button
          className="btn btn--wide btn--outline"
          type="button"
          data-action="demo-register"
          onClick={() => showToast("Account creation placeholder opened")}
        >
          Create account
        </button>
      </div>
    </form>
  );
}
