import React from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "reactstrap";
import "./CustomModal.css";

const CustomModal = ({
    isOpen = false,
    toggle = () => { },
    title = "",
    subtitle = "",
    icon = null,
    children,
    actions = null,        // opcional para footer pegajoso
    size = "lg",           // 'sm' | 'lg' | 'xl'
    centered = true,
    scrollable = true,
    className = "",
    contentClassName = "",
}) => {
    return (
        <Modal
            isOpen={isOpen}
            toggle={toggle}
            size={size}
            centered={centered}
            scrollable={scrollable}
            className={`custom-modal ${className}`}
            contentClassName={`custom-modal-content ${contentClassName}`}
            fade
            backdrop
        >
            <ModalHeader toggle={toggle} className="cm-header">
                <div className="cm-title">
                    {icon ? <span className="cm-icon">{icon}</span> : null}
                    <div className="cm-title-col">
                        <h3 className="cm-title-text">{title}</h3>
                        {subtitle ? <p className="cm-subtitle">{subtitle}</p> : null}
                    </div>
                </div>
            </ModalHeader>

            <ModalBody className="cm-body">{children}</ModalBody>

            {actions && <ModalFooter className="cm-footer">{actions}</ModalFooter>}
        </Modal>
    );
};

export default CustomModal;
