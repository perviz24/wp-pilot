"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface CredentialField {
  id: string;
  label: string;
  placeholder: string;
  type?: string;
  half?: boolean;
  hint?: string;
}

interface CredentialSectionProps {
  icon: LucideIcon;
  iconColor: string;
  title: string;
  description: string;
  fields: CredentialField[];
  values: Record<string, string>;
  onChange: (id: string, value: string) => void;
  isComplete: boolean;
}

export function CredentialSection({
  icon: Icon,
  iconColor,
  title,
  description,
  fields,
  values,
  onChange,
  isComplete,
}: CredentialSectionProps) {
  const [expanded, setExpanded] = useState(false);

  // Group fields for grid layout
  const halfFields: CredentialField[] = [];
  const fullFields: CredentialField[] = [];
  for (const field of fields) {
    if (field.half) halfFields.push(field);
    else fullFields.push(field);
  }

  return (
    <Card>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          <div>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isComplete && <Check className="h-4 w-4 text-green-500" />}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>
      {expanded && (
        <>
          <Separator />
          <CardContent className="space-y-4 pt-4">
            {halfFields.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {halfFields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <Label htmlFor={field.id}>{field.label}</Label>
                    <Input
                      id={field.id}
                      type={field.type ?? "text"}
                      placeholder={field.placeholder}
                      value={values[field.id] ?? ""}
                      onChange={(e) => onChange(field.id, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}
            {fullFields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id}>{field.label}</Label>
                <Input
                  id={field.id}
                  type={field.type ?? "text"}
                  placeholder={field.placeholder}
                  value={values[field.id] ?? ""}
                  onChange={(e) => onChange(field.id, e.target.value)}
                />
                {field.hint && (
                  <p className="text-xs text-muted-foreground">{field.hint}</p>
                )}
              </div>
            ))}
          </CardContent>
        </>
      )}
    </Card>
  );
}
