import React from "react";
import {
  createMessage,
  DELETE_CONFIRMATION_MODAL_TITLE,
  DISCARD_POPUP_DONT_SAVE_BUTTON_TEXT,
  SAVE_OR_DISCARD_DATASOURCE_WARNING,
} from "@appsmith/constants/messages";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Text,
} from "design-system";
import { TEMP_DATASOURCE_ID } from "constants/Datasource";
import { hasManageDatasourcePermission } from "@appsmith/utils/permissionHelpers";

interface SaveOrDiscardModalProps {
  isOpen: boolean;
  onDiscard(): void;
  onSave?(): void;
  onClose(): void;
  datasourceId: string;
  datasourcePermissions: string[];
  saveButtonText: string;
}

function SaveOrDiscardDatasourceModal(props: SaveOrDiscardModalProps) {
  const {
    datasourceId,
    datasourcePermissions,
    isOpen,
    onClose,
    onDiscard,
    onSave,
    saveButtonText,
  } = props;

  const createMode = datasourceId === TEMP_DATASOURCE_ID;
  const canManageDatasources = hasManageDatasourcePermission(
    datasourcePermissions,
  );
  const disableSaveButton = !createMode && !canManageDatasources;

  return (
    <Modal onOpenChange={onClose} open={isOpen}>
      <ModalContent>
        <ModalHeader>
          {createMessage(DELETE_CONFIRMATION_MODAL_TITLE)}
        </ModalHeader>
        <ModalBody>
          <Text>{createMessage(SAVE_OR_DISCARD_DATASOURCE_WARNING)}</Text>
        </ModalBody>
        <ModalFooter>
          <Button
            className="t--datasource-modal-do-not-save"
            kind="secondary"
            onClick={onDiscard}
            size="md"
          >
            {createMessage(DISCARD_POPUP_DONT_SAVE_BUTTON_TEXT)}
          </Button>
          <Button
            className="t--datasource-modal-save"
            isDisabled={disableSaveButton}
            onClick={onSave}
            size="md"
          >
            {saveButtonText}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default SaveOrDiscardDatasourceModal;
