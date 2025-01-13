import ShippingAddress from "../models/shippingAddress.js";

export const createShippingAddress = async (req, res) => {
    try {
        // Destructure and validate required fields
        const {
            usuario_id: usuarioId,
            direccion,
            ciudad,
            estado_provincia: estadoProvincia,
            codigo_postal: codigoPostal,
            pais
        } = req.body;

        // Input validation
        if (!usuarioId || !direccion || !ciudad || !estadoProvincia || !codigoPostal || !pais) {
            return res.status(400).json({
                error: "All fields are required",
                required: ["usuario_id", "direccion", "ciudad", "estado_provincia", "codigo_postal", "pais"]
            });
        }

        // Check maximum addresses per user
        const userAddressCount = await ShippingAddress.count({
            where: { usuario_id: usuarioId }
        });
        if (userAddressCount >= 5) {
            return res.status(400).json({
                error: "Maximum number of addresses reached (5)"
            });
        }

        // Create shipping address
        const shippingAddress = await ShippingAddress.create({
            usuario_id: usuarioId,
            direccion: direccion.trim(),
            ciudad: ciudad.trim(),
            estado_provincia: estadoProvincia.trim(),
            codigo_postal: codigoPostal.trim(),
            pais: pais.trim()
        });

        // Return success response
        return res.status(201).json({
            message: "Shipping address created successfully",
            data: shippingAddress
        });

    } catch (error) {
        console.error('Error creating shipping address:', error);
        return res.status(500).json({
            error: "Error creating shipping address",
            details: error.message
        });
    }
};

export const getShippingAddressesByUserId = async (req, res) => {
    try {
        const { usuario_id: usuarioId } = req.params;

        // Validate user ID
        if (!usuarioId) {
            return res.status(400).json({
                error: "User ID is required"
            });
        }

        // Check if user has any addresses
        const addressCount = await ShippingAddress.count({
            where: { usuario_id: usuarioId }
        });

        if (addressCount === 0) {
            return res.status(404).json({
                message: "No shipping addresses found for this user"
            });
        }

        // Get addresses with pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const shippingAddresses = await ShippingAddress.findAndCountAll({
            where: { usuario_id: usuarioId },
            limit,
            offset,
            order: [['created_at', 'DESC']],
            attributes: [
                'id',
                'direccion',
                'ciudad',
                'estado_provincia',
                'codigo_postal',
                'pais',
                'created_at',
                'updated_at'
            ]
        });

        // Format response
        const totalPages = Math.ceil(shippingAddresses.count / limit);

        return res.status(200).json({
            message: "Shipping addresses retrieved successfully",
            data: {
                addresses: shippingAddresses.rows,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems: shippingAddresses.count,
                    itemsPerPage: limit
                }
            }
        });

    } catch (error) {
        console.error('Error fetching shipping addresses:', error);
        return res.status(500).json({
            error: "Error retrieving shipping addresses",
            details: error.message
        });
    }
};

export const getAllShippingAddresses = async (req, res) => {
    try {
        const shippingAddresses = await ShippingAddress.findAll();
        res.status(200).json(shippingAddresses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteShippingAddress = async (req, res) => {
    try {
        const { id_ShipingAddress } = req.params;
        await ShippingAddress.destroy({ where: { id_ShipingAddress } });
        res.status(204).end();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}