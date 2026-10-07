import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CartView from "../../components/Cart/CartView";
import AddressForm from "../../components/Checkout/Address/AddressForm";
import AddressList from "../../components/Checkout/Address/AddressList";
import SummarySection from "../../components/Checkout/SummarySection/SummarySection";
import Button from "../../components/common/Button";
import ErrorMessage from "../../components/common/ErrorMessage/ErrorMessage";
import Loading from "../../components/common/Loading/Loading";
import { useCart } from "../../context/CartContext";
import "./Checkout.css";

//REMOVE BOTH THESE FUNCTIONS LATER
const getDefaultShippingAddress = () => {};
const getShippingAddresses = () => {};

export default function Checkout() {
  const navigate = useNavigate();
  // Contexto global del carrito
  const { cartItems, total, clearCart } = useCart();

  // Estados para direcciones y métodos de pago
  const [addresses, setAddresses] = useState([]);

  // Estados para control de componentes
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Estados para mantener el valor de las dirección o método de pago seleccionado
  const [selectedAddress, setSelectedAddress] = useState(null);

  // Control visual del componente de direcciones
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressSectionOpen, setAddressSectionOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);

  // Control de orden
  const [isOrderFinished, setIsOrderFinished] = useState(false);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [addrList, defaultAdd] = await Promise.all([
        getShippingAddresses(),
        getDefaultShippingAddress(),
      ]);

      setAddresses(addrList || []);

      setSelectedAddress(defaultAdd);
      setAddressSectionOpen(!defaultAdd);
    } catch (err) {
      setError("Unable to load addresses");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    debugger;
    if (!cartItems || cartItems.length === 0) {
      if (!isOrderFinished) {
        navigate("/cart");
      }
    }
  }, [cartItems, navigate]);

  useEffect(() => {
    if (!selectedAddress) {
      setAddressSectionOpen(true);
    }
  }, [selectedAddress]);

  useEffect(() => {
    let mounted = true;
    if (mounted) loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const handleAddressToggle = () => {
    setShowAddressForm(false);
    setEditingAddress(null);
    setAddressSectionOpen((prev) => !prev);
  };

  const handleSelectAddress = (address) => {
    setSelectedAddress(address);
    setShowAddressForm(false);
    setEditingAddress(null);
    setAddressSectionOpen(false);
  };

  const handleAddressNew = () => {
    setShowAddressForm(true);
    setEditingAddress(null);
    setAddressSectionOpen(true);
  };

  const handleAddressEdit = (address) => {
    setShowAddressForm(true);
    setEditingAddress(address);
    setAddressSectionOpen(true);
  };

  const handleAddressDelete = (address) => {
    let updatedAddressess = addresses.filter((add) => add._id !== address._id);

    if (selectedAddress._id === address._id && updatedAddressess.length > 0) {
      setSelectedAddress(updatedAddressess[0]);
    } else {
      setSelectedAddress(null);
    }
    setAddresses(updatedAddressess);
  };

  /*
  const handleAddressSubmit = (formData) => {
    let item = null;
    let updatedItems = [];
    if (editingAddress) {
      item = { ...formData };
      updatedItems = addresses.map((address) => {
        if (address._id === item._id) {
          address = item;
        }
      });
    } else {
      item = { _id: new Date(), ...formData };
      updatedItems = [...addresses, item];
    }
    setAddresses(updatedItems);
  };*/

  const handleAddressSubmit = (formData) => {
    let updatedAddresses;
    let newSelectedAddress = selectedAddress;

    if (editingAddress) {
      // Edit: Update list
      updatedAddresses = addresses.map((addr) =>
        addr._id === editingAddress._id ? { ...addr, ...formData } : addr,
      );

      // If editing addres was selected, update selected address state
      // so we can immediately see the changes we made
      if (selectedAddress?._id === editingAddress._id) {
        newSelectedAddress = updatedAddresses.find(
          (a) => a._id === editingAddress._id,
        );
      }
    } else {
      // New: Add and update automatically
      const newAddress = { _id: Date.now().toString(), ...formData };
      updatedAddresses = [...addresses, newAddress];
      newSelectedAddress = newAddress;
    }

    setAddresses(updatedAddresses);
    setSelectedAddress(newSelectedAddress);
    setShowAddressForm(false);
    setEditingAddress(null);
    setAddressSectionOpen(false);
  };

  const formatMoney = (value) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(value);

  const subtotal = typeof total === "number" ? total : 0;
  const taxRate = 0.16;
  const shippingRate = 350;
  const freeShippingThreshold = 1000;

  const taxAmount = parseFloat((subtotal * taxRate).toFixed(2));
  const shippingCost = subtotal >= freeShippingThreshold ? 0 : shippingRate;
  const grandTotal = parseFloat(
    (subtotal + taxAmount + shippingCost).toFixed(2),
  );

  const handleCancelAddressForm = () => {
    setShowAddressForm(false);
    setEditingAddress(null);
    setAddressSectionOpen(true);
  };

  const handleCreateOrder = () => {
    if (!cartItems || cartItems.length === 0) {
      return;
    }

    const order = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      items: cartItems.map((item) => ({
        ...item,
        subtotal: item.price * item.quantity,
      })),
      subtotal,
      tax: taxAmount,
      shipping: shippingCost,
      total: grandTotal,
      shippingAddress: selectedAddress,
      status: "confirmed",
    };

    //Simulated persistence
    const orders = JSON.parse(localStorage.getItem("orders") || "[]");
    orders.push(order);
    localStorage.setItem("orders", JSON.stringify(orders));

    setIsOrderFinished(true);
    navigate("/order-confirmation", { state: { order } });
    clearCart();
  };

  return loading ? (
    <div className="checkout-loading">
      <Loading>
        <p>Loading user information...</p>
      </Loading>
    </div>
  ) : error ? (
    <ErrorMessage>{error}</ErrorMessage>
  ) : (
    <div className="checkout-container">
      <div className="checkout-left">
        <SummarySection
          title="1. Shipping address"
          selected={selectedAddress}
          summaryContent={
            <div className="selected-address">
              <p>{selectedAddress?.name}</p>
              <p>{selectedAddress?.address1}</p>
              <p>
                {selectedAddress?.city}, {selectedAddress?.postalCode}
              </p>
            </div>
          }
          isExpanded={showAddressForm || addressSectionOpen || !selectedAddress}
          onToggle={handleAddressToggle}
        >
          {!showAddressForm && !editingAddress ? (
            <AddressList
              addresses={addresses}
              selectedAddress={selectedAddress}
              onSelect={(address) => handleSelectAddress(address)}
              onEdit={(address) => handleAddressEdit(address)}
              onAdd={handleAddressNew}
              onDelete={(address) => handleAddressDelete(address)}
            ></AddressList>
          ) : (
            <AddressForm
              onSubmit={handleAddressSubmit}
              onCancel={handleCancelAddressForm}
              initialValues={editingAddress || {}}
              isEdit={!!editingAddress}
            ></AddressForm>
          )}
        </SummarySection>
        <SummarySection
          title="2. Order details"
          selected={true}
          isExpanded={true}
        >
          <CartView />
        </SummarySection>
      </div>
      <div className="checkout-right">
        <div className="checkout-summary">
          <h3>Order summary</h3>
          <div className="summary-details">
            <p>
              <strong>Shipping addresss: </strong>
              {selectedAddress?.name}
            </p>
            <div className="order-costs">
              <p>
                <strong>Subtotal: </strong>
                {formatMoney(subtotal)}
              </p>
              <p>
                <strong>IVA (16%): </strong>
                {formatMoney(taxAmount)}
              </p>
              <p>
                <strong>Shipping: </strong>
                {formatMoney(shippingCost)}
              </p>
              <p>
                <strong>Total: </strong>
                {formatMoney(grandTotal)}
              </p>
              <p>
                <strong>Estimated delivery: </strong>
                {new Date(
                  Date.now() + 2 * 24 * 60 * 60 * 1000,
                ).toLocaleDateString()}
              </p>
            </div>
            <Button
              className="play-button"
              disabled={!cartItems || cartItems.length === 0}
              title={
                !cartItems || cartItems.length === 0
                  ? "No products in cart"
                  : "Confirm payment"
              }
              onClick={handleCreateOrder}
            >
              Confirm payment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
