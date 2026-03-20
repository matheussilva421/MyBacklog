import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Modal } from "./cyberpunk-ui";

function ModalHarness() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        abrir modal
      </button>
      {open ? (
        <Modal title="Teste" description="Modal de teste" onClose={() => setOpen(false)}>
          <div className="modal-form">
            <label className="field">
              <span>Nome</span>
              <input data-autofocus defaultValue="" />
            </label>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

describe("Modal", () => {
  it("moves focus into the modal, locks scroll, closes on escape, and restores focus", async () => {
    render(<ModalHarness />);

    const launcher = screen.getByRole("button", { name: /abrir modal/i });
    launcher.focus();

    fireEvent.click(launcher);

    const input = await screen.findByRole("textbox");
    await waitFor(() => {
      expect(input).toHaveFocus();
      expect(document.body.style.overflow).toBe("hidden");
    });

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(document.body.style.overflow).toBe("");
      expect(launcher).toHaveFocus();
    });
  });

  it("closes when clicking on the backdrop", async () => {
    render(<ModalHarness />);

    fireEvent.click(screen.getByRole("button", { name: /abrir modal/i }));
    const dialog = await screen.findByRole("dialog");

    fireEvent.click(dialog);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
