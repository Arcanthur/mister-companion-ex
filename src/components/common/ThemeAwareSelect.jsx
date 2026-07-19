/**
 * ThemeAwareSelect.jsx
 *
 * Keeps ordinary themes on the platform-native <select>, but swaps to the
 * fully themed popup while macOS Platinum is active. This preserves existing
 * behavior everywhere else while giving Platinum complete control over its
 * menu bevel, geometry, scrollbar, and selected-item glyph.
 */

import React, { useEffect, useMemo, useState } from "react";
import { CustomSelect } from "./CustomSelect";

function isPlatinumThemeActive() {
  if (typeof document === "undefined") return false;
  return Boolean(document.querySelector(".app-shell.app-style-macos9platinum"));
}

function optionLabel(children) {
  return React.Children.toArray(children)
    .map((child) => (typeof child === "string" || typeof child === "number" ? String(child) : ""))
    .join("")
    .trim();
}

function collectOptions(children, inheritedGroup = "") {
  const options = [];

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;

    if (child.type === "optgroup") {
      options.push(...collectOptions(child.props.children, String(child.props.label || inheritedGroup)));
      return;
    }

    if (child.type !== "option") return;

    const label = optionLabel(child.props.children);
    options.push({
      value: String(child.props.value ?? label),
      label,
      group: inheritedGroup,
      disabled: Boolean(child.props.disabled),
    });
  });

  return options;
}

export function ThemeAwareSelect({ children, className = "", disabled = false, onChange, value, ...nativeProps }) {
  const [platinumActive, setPlatinumActive] = useState(isPlatinumThemeActive);
  const options = useMemo(() => collectOptions(children), [children]);

  useEffect(() => {
    const root = document.getElementById("root");
    if (!root) return undefined;

    const syncTheme = () => setPlatinumActive(isPlatinumThemeActive());
    const observer = new MutationObserver(syncTheme);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class"],
      childList: true,
      subtree: true,
    });
    syncTheme();

    return () => observer.disconnect();
  }, []);

  if (!platinumActive) {
    return (
      <select className={className} disabled={disabled} onChange={onChange} value={value} {...nativeProps}>
        {children}
      </select>
    );
  }

  const ariaLabel = nativeProps["aria-label"] || nativeProps.title;
  const customClassName = ["theme-aware-select", className].filter(Boolean).join(" ");

  return (
    <CustomSelect
      ariaLabel={ariaLabel}
      className={customClassName}
      disabled={disabled}
      onChange={(nextValue) => {
        const selectedOption = options.find((option) => option.value === nextValue);
        const optionNode = {
          label: selectedOption?.label || "",
          textContent: selectedOption?.label || "",
          value: nextValue,
        };
        const eventTarget = {
          name: nativeProps.name,
          selectedIndex: Math.max(0, options.findIndex((option) => option.value === nextValue)),
          selectedOptions: [optionNode],
          value: nextValue,
        };
        onChange?.({ currentTarget: eventTarget, target: eventTarget });
      }}
      options={options}
      value={String(value ?? "")}
    />
  );
}
