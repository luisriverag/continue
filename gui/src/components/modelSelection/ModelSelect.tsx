import {
  CheckIcon,
  ChevronDownIcon,
  CubeIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useContext, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import styled from "styled-components";
import { defaultBorderRadius, lightGray } from "..";
import { useAuth } from "../../context/Auth";
import { IdeMessengerContext } from "../../context/IdeMessenger";
import AddModelForm from "../../forms/AddModelForm";
import { useAppSelector } from "../../redux/hooks";
import {
  selectDefaultModel,
  setDefaultModel,
} from "../../redux/slices/configSlice";
import { setDialogMessage, setShowDialog } from "../../redux/slices/uiSlice";
import { getMetaKeyLabel, isMetaEquivalentKeyPressed } from "../../util";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "../ui";

interface ModelOptionProps {
  option: Option;
  idx: number;
  showMissingApiKeyMsg: boolean;
  isSelected?: boolean;
}

interface Option {
  value: string;
  title: string;
  apiKey?: string;
}

const IconBase = styled.div<{ $hovered: boolean }>`
  width: 1.2em;
  height: 1.2em;
  cursor: pointer;
  padding: 4px;
  border-radius: ${defaultBorderRadius};
  opacity: ${(props) => (props.$hovered ? 0.75 : 0)};
  visibility: ${(props) => (props.$hovered ? "visible" : "hidden")};

  &:hover {
    opacity: 1;
    background-color: ${lightGray}33;
  }
`;

function modelSelectTitle(model: any): string {
  if (model?.title) return model?.title;
  if (model?.model !== undefined && model?.model.trim() !== "") {
    if (model?.class_name) {
      return `${model?.class_name} - ${model?.model}`;
    }
    return model?.model;
  }
  return model?.class_name;
}

function ModelOption({
  option,
  idx,
  showMissingApiKeyMsg,
  isSelected,
}: ModelOptionProps) {
  const ideMessenger = useContext(IdeMessengerContext);

  const [hovered, setHovered] = useState(false);

  function onClickGear(e: any) {
    e.stopPropagation();
    e.preventDefault();

    ideMessenger.post("config/openProfile", { profileId: undefined });
  }

  function handleOptionClick(e: any) {
    if (showMissingApiKeyMsg) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  return (
    <ListboxOption
      key={idx}
      disabled={showMissingApiKeyMsg}
      value={option.value}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleOptionClick}
    >
      <div className="flex flex-col gap-0.5">
        <div className="flex flex-1 flex-row items-center justify-between gap-2">
          <div className="flex flex-1 flex-row items-center gap-2">
            <CubeIcon className="h-3 w-3 flex-shrink-0" />
            <span className="line-clamp-1 flex-1">
              {option.title}
              {showMissingApiKeyMsg && (
                <span className="ml-2 text-[10px] italic">
                  (Missing API key)
                </span>
              )}
            </span>
          </div>
          <div className="flex flex-shrink-0 flex-row items-center">
            {/* <StyledCog6ToothIcon $hovered={hovered} onClick={onClickGear} /> */}
            {isSelected && <CheckIcon className="h-3 w-3" />}
          </div>
        </div>
      </div>
    </ListboxOption>
  );
}

function ModelSelect() {
  const dispatch = useDispatch();
  const defaultModel = useAppSelector(selectDefaultModel);
  const allModels = useAppSelector((state) => state.config.config.models);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [sortedOptions, setSortedOptions] = useState<Option[]>([]);
  const { selectedProfile } = useAuth();

  // Sort so that options without an API key are at the end
  useEffect(() => {
    const enabledOptions = options.filter((option) => option.apiKey !== "");
    const disabledOptions = options.filter((option) => option.apiKey === "");

    const sorted = [...enabledOptions, ...disabledOptions];

    setSortedOptions(sorted);
  }, [options]);

  useEffect(() => {
    setOptions(
      allModels
        .filter((m) => !m.roles || m.roles.includes("chat"))
        .map((model) => {
          return {
            value: model.title,
            title: modelSelectTitle(model),
            apiKey: model.apiKey,
          };
        }),
    );
  }, [allModels]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "'" && isMetaEquivalentKeyPressed(event as any)) {
        const direction = event.shiftKey ? -1 : 1;
        const currentIndex = options.findIndex(
          (option) => option.value === defaultModel?.title,
        );
        let nextIndex = (currentIndex + 1 * direction) % options.length;
        if (nextIndex < 0) nextIndex = options.length - 1;
        const newModelTitle = options[nextIndex].value;
        dispatch(setDefaultModel({ title: newModelTitle }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [options, defaultModel]);

  function onClickAddModel(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();

    // Close the dropdown
    if (buttonRef.current) {
      buttonRef.current.click();
    }
    dispatch(setShowDialog(true));
    dispatch(
      setDialogMessage(
        <AddModelForm
          onDone={() => {
            dispatch(setShowDialog(false));
          }}
        />,
      ),
    );
  }

  return (
    // <span className="line-clamp-1">Hiad sfasdfasdf asdfasdf</span>
    <Listbox
      onChange={async (val: string) => {
        if (val === defaultModel?.title) return;
        dispatch(setDefaultModel({ title: val }));
      }}
    >
      <div className="relative flex">
        <ListboxButton
          data-testid="model-select-button"
          ref={buttonRef}
          className="h-[18px] gap-1 border-none text-gray-400"
        >
          <span className="line-clamp-1 hover:brightness-110">
            {modelSelectTitle(defaultModel) || "Select model"}
          </span>
          <ChevronDownIcon
            className="h-2 w-2 flex-shrink-0 hover:brightness-110"
            aria-hidden="true"
          />
        </ListboxButton>
        <ListboxOptions className={"min-w-[160px]"}>
          <div className={`no-scrollbar max-h-[300px] overflow-y-auto`}>
            {sortedOptions.map((option, idx) => (
              <ModelOption
                option={option}
                idx={idx}
                key={idx}
                showMissingApiKeyMsg={option.apiKey === ""}
                isSelected={option.value === defaultModel?.title}
              />
            ))}
          </div>

          <div className="">
            {selectedProfile?.profileType === "local" && (
              <>
                <ListboxOption
                  key={options.length}
                  onClick={onClickAddModel}
                  value={"addModel" as any}
                >
                  <div className="flex items-center py-0.5">
                    <PlusIcon className="mr-2 h-3 w-3" />
                    Add Chat model
                  </div>
                </ListboxOption>
              </>
            )}

            <span className="block px-2 py-1" style={{ color: lightGray }}>
              {getMetaKeyLabel()}' to toggle model
            </span>
          </div>
        </ListboxOptions>
      </div>
    </Listbox>
  );
}

export default ModelSelect;
