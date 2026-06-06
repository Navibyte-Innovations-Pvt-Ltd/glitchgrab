import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation } from "@tanstack/react-query";
import { Check, GripVertical, Loader2, Plus, Sparkles, X } from "lucide-react";
import { useState } from "react";
import {
  useFieldArray,
  useFormContext,
  Control,
  FieldErrors,
  FieldValues,
  useWatch,
} from "react-hook-form";
import { toast } from "react-hot-toast";

interface InputListProps {
  name: string;
  label?: string;
  placeholder?: string;
  description?: string;
  className?: string;
  required?: boolean;
  aiEnabled?: boolean;
  aiPrompt?: string;
  aiContext?: string;
}

function SortableItem({
  id,
  index,
  name,
  placeholder,
  errors,
  register,
  onRemove,
  onPaste,
}: {
  id: string;
  index: number;
  name: string;
  placeholder: string;
  errors: FieldErrors<FieldValues>;
  register: ReturnType<typeof useFormContext>["register"];
  onRemove: () => void;
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>, index: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2",
        isDragging && "z-50 opacity-50",
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-slate-400 hover:text-slate-600 active:cursor-grabbing dark:hover:text-slate-300"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Input
        {...register(`${name}.${index}`)}
        placeholder={placeholder}
        className={cn(
          "flex-1 bg-white dark:bg-slate-950",
          (errors[name] as unknown as FieldErrors<FieldValues>)?.[index] &&
            "border-destructive focus-visible:ring-destructive",
        )}
        onPaste={(e) => onPaste(e, index)}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/30"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function InputList({
  name,
  label,
  placeholder = "Add item...",
  description,
  className,
  required,
  aiEnabled = false,
  aiPrompt,
  aiContext,
}: InputListProps) {
  const {
    control,
    register,
    formState: { errors },
    setValue,
  } = useFormContext();

  const { fields, append, remove, move } = useFieldArray({
    control: control as Control<FieldValues>,
    name,
  });

  const error = errors[name];
  const errorMessage = error?.message as string | undefined;

  const currentValues = useWatch({ name }) || [];

  const [suggestions, setSuggestions] = useState<string[]>([]);

  const { mutate: generateSuggestions, isPending: isGenerating } = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/ai/generate-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt ||
            `Generate 6-8 professional items for a "${name}" list of a service. Return ONLY a JSON array of strings, no markdown, no explanation. Example: ["Item 1", "Item 2"]`,
          context: aiContext || "",
          maxLength: 500,
        }),
      });
      if (!response.ok) throw new Error("Failed to generate suggestions");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.text) {
        try {
          const jsonMatch = data.text.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const items: string[] = JSON.parse(jsonMatch[0]);
            const existingSet = new Set(
              (currentValues as string[]).map((v: string) => v.toLowerCase().trim()),
            );
            const newSuggestions = items.filter(
              (item) => !existingSet.has(item.toLowerCase().trim()),
            );
            setSuggestions(newSuggestions);
            if (newSuggestions.length === 0) {
              toast.success("All suggestions are already in your list!");
            }
          }
        } catch {
          toast.error("Could not parse AI suggestions");
        }
      }
    },
    onError: () => {
      toast.error("Failed to generate suggestions");
    },
  });

  const addSuggestion = (suggestion: string) => {
    append(suggestion);
    setSuggestions((prev) => prev.filter((s) => s !== suggestion));
  };

  const addAllSuggestions = () => {
    suggestions.forEach((s) => append(s));
    setSuggestions([]);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = fields.findIndex((f) => f.id === active.id);
    const newIndex = fields.findIndex((f) => f.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      move(oldIndex, newIndex);
    }
  };

  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    const pastedText = e.clipboardData.getData("text");
    if (!pastedText) return;

    const lines = pastedText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length > 1) {
      e.preventDefault();

      const currentItemText = currentValues[index] || "";

      if (!currentItemText.trim()) {
        const newValues = [...currentValues];
        newValues.splice(index, 1, ...lines);
        setValue(name, newValues, { shouldDirty: true, shouldValidate: true });
      } else {
        const newValues = [...currentValues];
        newValues.splice(index + 1, 0, ...lines);
        setValue(name, newValues, { shouldDirty: true, shouldValidate: true });
      }
    }
  };

  return (
    <div className={cn("form-item space-y-2", className)}>
      {label && (
        <Label className={cn(error && "text-destructive")}>
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}

      <div className="space-y-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={fields.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            {fields.map((field, index) => (
              <SortableItem
                key={field.id}
                id={field.id}
                index={index}
                name={name}
                placeholder={placeholder}
                errors={errors}
                register={register}
                onRemove={() => remove(index)}
                onPaste={handlePaste}
              />
            ))}
          </SortableContext>
        </DndContext>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 border-dashed border-slate-300 text-slate-500 hover:border-primary hover:bg-primary/5 hover:text-primary dark:border-slate-700 dark:hover:bg-primary/10"
            onClick={() => append("")}
          >
            <Plus className="mr-2 h-3 w-3" />
            Add Item
          </Button>
          {aiEnabled && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 border-dashed border-primary/30 text-primary hover:border-primary hover:bg-primary/5 dark:border-primary/40 dark:hover:bg-primary/10"
              onClick={() => generateSuggestions()}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {isGenerating ? "Generating..." : "AI Suggest"}
            </Button>
          )}
        </div>

        {suggestions.length > 0 && (
          <div className="rounded-lg border border-primary/20 bg-linear-to-br from-primary/5 to-primary/10 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">
                  AI Suggestions
                </span>
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] text-primary hover:bg-primary/10"
                  onClick={addAllSuggestions}
                >
                  <Check className="mr-1 h-3 w-3" />
                  Add All
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => setSuggestions([])}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-white/80 px-2.5 py-1 text-xs text-slate-700 transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary dark:bg-slate-900/80 dark:text-slate-300"
                  onClick={() => addSuggestion(suggestion)}
                >
                  <Plus className="h-3 w-3 opacity-50" />
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {description && !errorMessage && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {errorMessage && (
        <p className="text-xs font-medium text-destructive">{errorMessage}</p>
      )}
    </div>
  );
}
