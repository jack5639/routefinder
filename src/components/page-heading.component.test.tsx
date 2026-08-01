// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageHeading } from "@/components/page-heading";

describe("PageHeading", () => {
  it("exposes one descriptive page heading", () => {
    render(<PageHeading eyebrow="Workspace" title="This week" description="Three useful actions." />);
    expect(screen.getByRole("heading", { level: 1, name: "This week" })).toBeInTheDocument();
    expect(screen.getByText("Three useful actions.")).toBeInTheDocument();
  });
});
