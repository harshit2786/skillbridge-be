export const errorHandler = (err, req, res, next) => {
    console.error(`[Error] ${err.message}`);
    console.error(err.stack);
    res.status(500).json({
        message: "Internal server error",
        ...(process.env.NODE_ENV === "development" && { error: err.message }),
    });
};
//# sourceMappingURL=errorHandler.js.map