/**
 * CustomSelect.jsx
 * Auto-split from the original monolithic main.jsx.
 * Exports: CustomSelect
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { ThemedScrollbar } from "./ThemedScrollbar";

const PLATINUM_SELECTION_CONFIRMATION_MS = 750;

export function CustomSelect({ value, onChange, options, className = "", menuClassName = "", ariaLabel, disabled = false, placeholder = "" }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuStyle, setMenuStyle] = useState(null);
  const [selectionConfirmation, setSelectionConfirmation] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const menuScrollRef = useRef(null);
  const listId = useRef("select-" + Math.random().toString(36).slice(2));
  const confirmationTimersRef = useRef([]);
  const confirmationLockedRef = useRef(false);
  const matchedIndex = options.findIndex((option) => option.value === value);
  const selectedIndex = Math.max(0, matchedIndex);
  const selected = matchedIndex >= 0 ? options[matchedIndex] : placeholder ? null : options[0];


  const clearSelectionConfirmationTimers = useCallback(() => {
    confirmationTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    confirmationTimersRef.current = [];
  }, []);

  useEffect(() => () => clearSelectionConfirmationTimers(), [clearSelectionConfirmationTimers]);

  const positionMenu = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const computed = getComputedStyle(trigger);
    const variables = {};
    ["--app-font", "--app-font-family", "--app-font-size", "--control-font-effective", "--control-font-size-effective", "--control-font-weight-effective", "--control-font-style-effective", "--control-radius", "--card-radius", "--dropdown-menu-radius", "--text-box-radius", "--text-box-background-color", "--text-box-border-color", "--text-box-text-color", "--app-background", "--panel-background", "--modal-background", "--border-color", "--text-color", "--muted-text-color", "--faint-text-color", "--highlight-color", "--glyph-color", "--glyph-hover-color", "--glyph-selected-color", "--scrollbar-track-color", "--scrollbar-thumb-color", "--scrollbar-thumb-hover-color", "--scrollbar-thickness", "--scrollbar-radius", "--scrollbar-edge-padding", "--dropdown-scrollbar-padding", "--scrollbar-glow-size", "--scrollbar-glow-spread", "--scrollbar-glow-hover-boost", "--scrollbar-glow-color", "--scrollbar-glow-opacity-effective", "--scrollbar-glow-outline-opacity-effective", "--dropdown-menu-background-color", "--dropdown-menu-border-color", "--dropdown-blur-amount", "--dropdown-shadow-offset-x", "--dropdown-shadow-offset-y", "--dropdown-shadow-blur", "--dropdown-shadow-spread", "--dropdown-shadow-color", "--dropdown-shadow-opacity-effective", "--dropdown-item-background-color", "--dropdown-item-text-color", "--dropdown-item-border-color", "--dropdown-item-hover-background-color", "--dropdown-item-hover-text-color", "--dropdown-item-hover-border-color", "--dropdown-item-selected-background-color", "--dropdown-item-selected-text-color", "--dropdown-item-selected-border-color", "--dropdown-item-pressed-background-color", "--dropdown-item-pressed-text-color", "--dropdown-item-pressed-border-color", "--dropdown-group-text-color", "--dropdown-item-radius", "--dropdown-glow-size", "--dropdown-glow-spread", "--dropdown-glow-hover-boost", "--dropdown-glow-color", "--dropdown-glow-opacity-effective", "--dropdown-glow-outline-opacity-effective", "--button-background-color", "--button-hover-background-color", "--button-pressed-color", "--button-selected-background-color", "--button-disabled-background-color", "--button-border-color", "--button-hover-border-color", "--button-pressed-border-color", "--button-selected-border-color", "--button-disabled-border-color", "--button-text-color", "--button-hover-text-color", "--button-pressed-text-color", "--button-selected-text-color", "--button-disabled-text-color", "--glyph-color", "--glyph-hover-color", "--glyph-pressed-color", "--glyph-selected-color", "--glyph-disabled-color", "--surface-opacity", "--blur-amount", "--mac9-inner-face", "--mac9-bevel-light-color", "--mac9-bevel-dark-color", "--mac9-selection", "--mac9-selection-text", "--mac9-menu-background-color", "--mac9-menu-text-color", "--mac9-scrollbar-track-color", "--mac9-scrollbar-thumb-color", "--mac9-scrollbar-thumb-border-color", "--mac9-asset-filter-effective", "--platinum-dropdown-menu-left-inset", "--platinum-dropdown-button-width"].forEach((name) => {
      variables[name] = computed.getPropertyValue(name);
    });
    const platinumTheme = Boolean(trigger.closest(".app-style-macos9platinum"));
    const gap = platinumTheme ? 4 : 6;
    const maximumHeight = Math.min(300, window.innerHeight - 24);
    const spaceBelow = window.innerHeight - rect.bottom - gap - 12;
    const openAbove = !platinumTheme && spaceBelow < Math.min(190, maximumHeight) && rect.top > spaceBelow;
    const platinumLeftInset = Number.parseFloat(computed.getPropertyValue("--platinum-dropdown-menu-left-inset")) || 7;
    const platinumButtonWidth = Number.parseFloat(computed.getPropertyValue("--platinum-dropdown-button-width")) || 31;
    const menuWidth = platinumTheme
      ? Math.min(window.innerWidth - 24, Math.max(1, rect.width - platinumLeftInset - platinumButtonWidth))
      : Math.min(window.innerWidth - 24, Math.max(rect.width + 18, 198));
    const menuLeft = platinumTheme ? rect.left + platinumLeftInset : rect.left;
    setMenuStyle({
      ...variables,
      left: Math.max(12, Math.min(menuLeft, window.innerWidth - menuWidth - 12)),
      width: menuWidth,
      maxHeight: maximumHeight,
      ...(openAbove ? { bottom: window.innerHeight - rect.top + gap } : { top: rect.bottom + gap }),
    });
  }, []);

  const showMenu = useCallback((index = selectedIndex) => {
    if (disabled) return;
    setActiveIndex(Math.max(0, index));
    positionMenu();
    setOpen(true);
  }, [disabled, positionMenu, selectedIndex]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event) => {
      if (confirmationLockedRef.current) return;
      if (!triggerRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false);
    };
    const reposition = () => positionMenu();
    const closeOnExternalScroll = (event) => {
      if (confirmationLockedRef.current) return;
      if (!menuRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    window.addEventListener("resize", reposition);
    document.addEventListener("scroll", closeOnExternalScroll, true);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      window.removeEventListener("resize", reposition);
      document.removeEventListener("scroll", closeOnExternalScroll, true);
    };
  }, [open, positionMenu]);

  useEffect(() => {
    if (open) menuRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const choose = (index) => {
    const option = options[index];
    if (!option || option.disabled || confirmationLockedRef.current) return;

    const platinumTheme = Boolean(triggerRef.current?.closest(".app-style-macos9platinum"));
    if (!platinumTheme) {
      onChange(option.value);
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }

    // A dedicated overlay owns the Platinum acknowledgement visuals. This
    // avoids hover and selected-row rules fighting the timed blue/white flash.
    confirmationLockedRef.current = true;
    clearSelectionConfirmationTimers();
    setActiveIndex(index);
    setSelectionConfirmation({ index });

    confirmationTimersRef.current.push(window.setTimeout(() => {
      onChange(option.value);
      setOpen(false);
      setSelectionConfirmation(null);
      confirmationLockedRef.current = false;
      confirmationTimersRef.current = [];
      // The Platinum trigger deliberately releases focus after committing a
      // value so its sliced chrome returns to the normal state immediately.
      triggerRef.current?.blur();
    }, PLATINUM_SELECTION_CONFIRMATION_MS));
  };

  const handleKeyDown = (event) => {
    if (disabled) return;
    if (confirmationLockedRef.current) {
      event.preventDefault();
      return;
    }
    if (["ArrowDown", "ArrowUp", "Home", "End", "Enter", " ", "Escape"].includes(event.key)) event.preventDefault();
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      if (open) choose(activeIndex);
      else showMenu();
      return;
    }
    if (event.key === "Home") {
      if (!open) showMenu(0);
      else setActiveIndex(0);
      return;
    }
    if (event.key === "End") {
      if (!open) showMenu(options.length - 1);
      else setActiveIndex(options.length - 1);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      const direction = event.key === "ArrowDown" ? 1 : -1;
      if (!open) showMenu(Math.min(options.length - 1, Math.max(0, selectedIndex + direction)));
      else setActiveIndex((index) => (index + direction + options.length) % options.length);
    }
  };

  return (
    <div className={`custom-select sort-select ${className}`}>
      <button ref={triggerRef} type="button" className="custom-select-trigger" role="combobox" aria-label={ariaLabel} aria-controls={listId.current} aria-expanded={open} aria-haspopup="listbox" disabled={disabled} onClick={() => { if (!confirmationLockedRef.current) open ? setOpen(false) : showMenu(); }} onKeyDown={handleKeyDown}>
        <span className="custom-select-value">{selected?.label || placeholder || ""}</span>
        <span className="custom-select-chevron" aria-hidden="true" />
      </button>
      {open && menuStyle && createPortal(
        <div ref={menuRef} id={listId.current} className={`custom-select-menu${triggerRef.current?.closest(".app-style-macos9platinum") ? " app-style-macos9platinum" : ""}${menuClassName ? ` ${menuClassName}` : ""}${selectionConfirmation ? " confirming-selection" : ""}`} role="listbox" aria-label={ariaLabel} style={menuStyle} onKeyDown={handleKeyDown}>
          <div ref={menuScrollRef} className="custom-select-scroll-area">
          {options.map((option, index) => {
            const visuallySelected = selectionConfirmation ? selectionConfirmation.index === index : option.value === value;
            const confirmingThisOption = selectionConfirmation?.index === index;
            const active = !selectionConfirmation && activeIndex === index;
            return (
              <React.Fragment key={option.value}>
                {option.group && option.group !== options[index - 1]?.group && <div className="custom-select-group">{option.group}</div>}
                <button type="button" role="option" aria-selected={visuallySelected} disabled={option.disabled} className={`custom-select-option${visuallySelected ? " selected" : ""}${active ? " active" : ""}${confirmingThisOption ? " confirmation-target" : ""}`} data-active={active} onPointerMove={() => !selectionConfirmation && !option.disabled && setActiveIndex(index)} onClick={() => choose(index)}>
                  <span>{option.label}</span>
                  {visuallySelected && <span className="custom-select-check" aria-hidden="true">✓</span>}
                  {confirmingThisOption && (
                    <span className="custom-select-confirmation-overlay" aria-hidden="true">
                      <span className="custom-select-confirmation-check">✓</span>
                      <span>{option.label}</span>
                    </span>
                  )}
                </button>
              </React.Fragment>
            );
          })}
          </div>
          <ThemedScrollbar scrollRef={menuScrollRef} className="dropdown-themed-scrollbar" />
        </div>,
        document.body,
      )}
    </div>
  );
}
