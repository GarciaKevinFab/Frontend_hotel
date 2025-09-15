import React, { useState } from "react";
import { Button } from "reactstrap";
import ExtendStayModal from "./ExtendStayModal";

/**
 * Botón plug-and-play: pásale la reserva y un callback para refrescar.
 */
const ExtendStayButton = ({ reservation, onExtended }) => {
    const [open, setOpen] = useState(false);

    if (!reservation?._id) return null;

    return (
        <>
            <Button color="primary" onClick={() => setOpen(true)}>
                Extender estadía
            </Button>

            <ExtendStayModal
                isOpen={open}
                toggle={() => setOpen(false)}
                reservation={reservation}
                onExtended={onExtended}
            />
        </>
    );
};

export default ExtendStayButton;
