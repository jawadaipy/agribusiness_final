import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface CategoryNode {
  id: string;
  label: string;
  count?: number;
  children?: CategoryNode[];
}

interface CategoryTreeProps {
  data: CategoryNode[];
  onSelect?: (node: CategoryNode) => void;
  selectedId?: string;
}

export function CategoryTree({ data, onSelect, selectedId }: CategoryTreeProps) {
  return (
    <div className="space-y-2">
      {data.map((node) => (
        <TreeNode 
          key={node.id} 
          node={node} 
          level={0} 
          onSelect={onSelect} 
          selectedId={selectedId} 
        />
      ))}
    </div>
  );
}

function TreeNode({ 
  node, 
  level, 
  onSelect, 
  selectedId 
}: { 
  node: CategoryNode; 
  level: number; 
  onSelect?: ((node: CategoryNode) => void) | undefined;
  selectedId?: string | undefined;
}) {
  const [isOpen, setIsOpen] = useState(level === 0);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;

  return (
    <div className="text-left">
      <button
        onClick={() => {
          if (hasChildren) setIsOpen(!isOpen);
          onSelect?.(node);
        }}
        className={cn(
          "w-full flex items-center justify-between py-2 transition-all group",
          isSelected ? "text-primary font-black" : "text-on-surface-variant/70 hover:text-primary",
          level > 0 && "pl-6"
        )}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          {hasChildren ? (
            <span className={cn(
              "material-symbols-outlined text-[18px] transition-transform duration-300",
              isOpen ? "rotate-180 text-secondary" : "text-on-surface-variant/40 group-hover:text-primary"
            )}>
              expand_more
            </span>
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-outline-variant/40 ml-2 mr-1" />
          )}
          <span className={cn(
            "truncate text-xs font-bold uppercase tracking-widest",
            isSelected && "tracking-[0.15em]"
          )}>
            {node.label}
          </span>
        </div>
        {node.count !== undefined && (
          <span className="text-[9px] font-bold text-on-surface-variant/40 bg-surface-container-low px-2 py-0.5 rounded-lg border border-outline-variant/20 group-hover:border-primary/20 transition-colors">
            {node.count}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-l border-outline-variant/10 ml-2"
          >
            {node.children!.map((child) => (
              <TreeNode 
                key={child.id} 
                node={child} 
                level={level + 1} 
                onSelect={onSelect} 
                selectedId={selectedId} 
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
