import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import {
  App as AntApp,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Layout,
  Menu,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import "antd/dist/reset.css";

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const API_BASE = (import.meta as any).env?.VITE_API_BASE || "http://localhost:3000";

type MenuKey = "dashboard" | "products" | "categories" | "orders" | "banners" | "users";

type DashboardStats = {
  totalOrders: number;
  paidOrders: number;
  totalPaidAmountCents: number;
  topProducts: Array<{ id: string; title: string; sales: number }>;
};

type ProductRow = {
  id: string;
  categoryId: string;
  title: string;
  subtitle: string;
  cover: string;
  images: string[];
  detail: string;
  enabled: boolean;
  recommended: boolean;
  sales: number;
  skus: Array<{ id: string; name: string; priceCents: number; stock: number; code: string }>;
};

type CategoryRow = {
  id: string;
  name: string;
  parentId?: string | null;
  sort: number;
  enabled: boolean;
};

type BannerRow = {
  id: string;
  image: string;
  title: string;
  targetType: "product" | "category" | "activity";
  targetId: string;
  sort: number;
  enabled: boolean;
};

type OrderRow = {
  id: string;
  orderNo: string;
  status: string;
  payableAmountCents: number;
  createdAt: string;
  user?: { nickname?: string; phone?: string };
  shipment?: { company?: string; trackingNo?: string; status?: string };
};

type UserRow = {
  id: string;
  nickname: string;
  phone?: string;
  orderCount: number;
  paidAmountCents: number;
};

const api = axios.create({ baseURL: API_BASE });

function statusColor(status: string): string {
  if (status === "pending_payment") return "gold";
  if (status === "paid_pending_shipment") return "blue";
  if (status === "shipped") return "cyan";
  if (status === "completed") return "green";
  if (status === "cancelled") return "red";
  return "default";
}

function toSkuText(skus: ProductRow["skus"]): string {
  return JSON.stringify(
    skus.map((s) => ({ id: s.id, name: s.name, priceCents: s.priceCents, stock: s.stock, code: s.code })),
    null,
    2,
  );
}

function parseSkuText(text: string): Array<{ id?: string; name: string; priceCents: number; stock: number; code: string }> {
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("SKU 列表不能为空，且必须是 JSON 数组");
  }
  return parsed.map((item) => ({
    id: item.id ? String(item.id) : undefined,
    name: String(item.name ?? ""),
    priceCents: Number(item.priceCents),
    stock: Number(item.stock),
    code: String(item.code ?? ""),
  }));
}

function parseImagesText(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function LoginView(props: { onLogin: (token: string) => void }) {
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const { data } = await api.post("/admin/auth/login", values);
      props.onLogin(`Bearer ${data.token}`);
      message.success(`登录成功：${data.role}`);
    } catch (error: any) {
      const detail = error?.response?.data?.message || error?.message || "未知错误";
      message.error(`登录失败：${detail}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f6fbff 0%, #eef3ff 100%)" }}>
      <Content style={{ display: "grid", placeItems: "center" }}>
        <Card style={{ width: 420, borderRadius: 16 }} bodyStyle={{ padding: 28 }}>
          <Title level={3} style={{ marginTop: 0 }}>
            商城后台登录
          </Title>
          <Text type="secondary">默认账号：admin/admin123 或 ops/ops123</Text>
          <br />
          <Text type="secondary">当前 API 地址：{API_BASE}</Text>
          <Form layout="vertical" onFinish={onFinish} style={{ marginTop: 20 }} initialValues={{ username: "admin", password: "admin123" }}>
            <Form.Item label="用户名" name="username" rules={[{ required: true }]}>
              <Input placeholder="请输入用户名" />
            </Form.Item>
            <Form.Item label="密码" name="password" rules={[{ required: true }]}>
              <Input.Password placeholder="请输入密码" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              登录
            </Button>
          </Form>
        </Card>
      </Content>
    </Layout>
  );
}

function AdminView(props: { token: string; onLogout: () => void }) {
  const { message } = AntApp.useApp();
  const [activeMenu, setActiveMenu] = useState<MenuKey>("dashboard");
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [banners, setBanners] = useState<BannerRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);

  const [shipModalOrder, setShipModalOrder] = useState<OrderRow | null>(null);
  const [shipSubmitting, setShipSubmitting] = useState(false);
  const [trackModalOrder, setTrackModalOrder] = useState<OrderRow | null>(null);
  const [trackSubmitting, setTrackSubmitting] = useState(false);

  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [editingCategory, setEditingCategory] = useState<CategoryRow | null>(null);
  const [editingBanner, setEditingBanner] = useState<BannerRow | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [productForm] = Form.useForm();
  const [categoryForm] = Form.useForm();
  const [bannerForm] = Form.useForm();
  const [trackForm] = Form.useForm();

  const headers = useMemo(() => ({ Authorization: props.token }), [props.token]);

  const loadDashboard = async () => {
    const { data } = await api.get<DashboardStats>("/admin/dashboard/stats", { headers });
    setStats(data);
  };

  const loadProducts = async () => {
    const { data } = await api.get<ProductRow[]>("/admin/products", { headers });
    setProducts(data);
  };

  const loadCategories = async () => {
    const { data } = await api.get<CategoryRow[]>("/admin/categories", { headers });
    setCategories(data);
  };

  const loadBanners = async () => {
    const { data } = await api.get<BannerRow[]>("/admin/banners", { headers });
    setBanners(data);
  };

  const loadOrders = async () => {
    const { data } = await api.get<OrderRow[]>("/admin/orders", { headers });
    setOrders(data);
  };

  const loadUsers = async () => {
    const { data } = await api.get<UserRow[]>("/admin/users", { headers });
    setUsers(data);
  };

  const refreshActive = async () => {
    setLoading(true);
    try {
      if (activeMenu === "dashboard") await loadDashboard();
      if (activeMenu === "products") await loadProducts();
      if (activeMenu === "categories") await loadCategories();
      if (activeMenu === "orders") await loadOrders();
      if (activeMenu === "banners") await loadBanners();
      if (activeMenu === "users") await loadUsers();
    } catch (error: any) {
      const detail = error?.response?.data?.message || error?.message || "未知错误";
      message.error(`加载失败（API: ${API_BASE}）：${detail}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshActive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMenu]);

  const openCreateProduct = () => {
    setEditingProduct(null);
    setProductModalOpen(true);
    productForm.setFieldsValue({
      categoryId: categories[0]?.id,
      title: "",
      subtitle: "",
      cover: "",
      imagesText: "",
      detail: "",
      enabled: true,
      recommended: false,
      skusText: JSON.stringify([{ name: "默认规格", priceCents: 1000, stock: 10, code: "SKU-001" }], null, 2),
    });
  };

  const openEditProduct = (row: ProductRow) => {
    setEditingProduct(row);
    setProductModalOpen(true);
    productForm.setFieldsValue({
      id: row.id,
      categoryId: row.categoryId,
      title: row.title,
      subtitle: row.subtitle,
      cover: row.cover,
      imagesText: row.images.join("\n"),
      detail: row.detail,
      enabled: row.enabled,
      recommended: row.recommended,
      skusText: toSkuText(row.skus),
    });
  };

  const saveProduct = async (values: any) => {
    setSaving(true);
    try {
      const payload = {
        id: values.id || undefined,
        categoryId: values.categoryId,
        title: values.title,
        subtitle: values.subtitle ?? "",
        cover: values.cover ?? "",
        images: parseImagesText(values.imagesText ?? ""),
        detail: values.detail ?? "",
        enabled: Boolean(values.enabled),
        recommended: Boolean(values.recommended),
        skus: parseSkuText(values.skusText ?? "[]"),
      };
      await api.post("/admin/products/upsert", payload, { headers });
      message.success("商品保存成功");
      setEditingProduct(null);
      setProductModalOpen(false);
      productForm.resetFields();
      await loadProducts();
    } catch (error: any) {
      const detail = error?.response?.data?.message || error?.message || "未知错误";
      message.error(`商品保存失败：${detail}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleProductEnabled = async (row: ProductRow, nextEnabled: boolean) => {
    try {
      await api.post(
        "/admin/products/upsert",
        {
          ...row,
          enabled: nextEnabled,
          skus: row.skus.map((s) => ({ id: s.id, name: s.name, priceCents: s.priceCents, stock: s.stock, code: s.code })),
        },
        { headers },
      );
      await loadProducts();
    } catch {
      message.error("状态更新失败");
    }
  };

  const openCreateCategory = () => {
    setEditingCategory(null);
    setCategoryModalOpen(true);
    categoryForm.setFieldsValue({ name: "", parentId: undefined, sort: categories.length + 1, enabled: true });
  };

  const openEditCategory = (row: CategoryRow) => {
    setEditingCategory(row);
    setCategoryModalOpen(true);
    categoryForm.setFieldsValue({
      id: row.id,
      name: row.name,
      parentId: row.parentId || undefined,
      sort: row.sort,
      enabled: row.enabled,
    });
  };

  const saveCategory = async (values: any) => {
    setSaving(true);
    try {
      await api.post(
        "/admin/categories/upsert",
        {
          id: values.id || undefined,
          name: values.name,
          parentId: values.parentId || undefined,
          sort: Number(values.sort),
          enabled: Boolean(values.enabled),
        },
        { headers },
      );
      message.success("分类保存成功");
      setEditingCategory(null);
      setCategoryModalOpen(false);
      categoryForm.resetFields();
      await loadCategories();
    } catch (error: any) {
      const detail = error?.response?.data?.message || error?.message || "未知错误";
      message.error(`分类保存失败：${detail}`);
    } finally {
      setSaving(false);
    }
  };

  const openCreateBanner = () => {
    setEditingBanner(null);
    setBannerModalOpen(true);
    bannerForm.setFieldsValue({
      image: "",
      title: "",
      targetType: "product",
      targetId: "",
      sort: banners.length + 1,
      enabled: true,
    });
  };

  const openEditBanner = (row: BannerRow) => {
    setEditingBanner(row);
    setBannerModalOpen(true);
    bannerForm.setFieldsValue({
      id: row.id,
      image: row.image,
      title: row.title,
      targetType: row.targetType,
      targetId: row.targetId,
      sort: row.sort,
      enabled: row.enabled,
    });
  };

  const saveBanner = async (values: any) => {
    setSaving(true);
    try {
      await api.post(
        "/admin/banners/upsert",
        {
          id: values.id || undefined,
          image: values.image,
          title: values.title,
          targetType: values.targetType,
          targetId: values.targetId,
          sort: Number(values.sort),
          enabled: Boolean(values.enabled),
        },
        { headers },
      );
      message.success("轮播保存成功");
      setEditingBanner(null);
      setBannerModalOpen(false);
      bannerForm.resetFields();
      await loadBanners();
    } catch (error: any) {
      const detail = error?.response?.data?.message || error?.message || "未知错误";
      message.error(`轮播保存失败：${detail}`);
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async (id: string) => {
    try {
      await api.delete(`/admin/products/${id}`, { headers });
      message.success("商品删除成功");
      await loadProducts();
    } catch (error: any) {
      const detail = error?.response?.data?.message || error?.message || "未知错误";
      message.error(`商品删除失败：${detail}`);
    }
  };

  const removeCategory = async (id: string) => {
    try {
      await api.delete(`/admin/categories/${id}`, { headers });
      message.success("分类删除成功");
      await loadCategories();
    } catch (error: any) {
      const detail = error?.response?.data?.message || error?.message || "未知错误";
      message.error(`分类删除失败：${detail}`);
    }
  };

  const removeBanner = async (id: string) => {
    try {
      await api.delete(`/admin/banners/${id}`, { headers });
      message.success("轮播删除成功");
      await loadBanners();
    } catch (error: any) {
      const detail = error?.response?.data?.message || error?.message || "未知错误";
      message.error(`轮播删除失败：${detail}`);
    }
  };

  const onShip = async (values: { company: string; companyCode?: string; trackingNo: string; expectedDeliveryAt?: string }) => {
    if (!shipModalOrder) return;
    setShipSubmitting(true);
    try {
      await api.post("/admin/orders/ship", { orderId: shipModalOrder.id, ...values }, { headers });
      message.success("发货成功");
      setShipModalOrder(null);
      await loadOrders();
    } catch {
      message.error("发货失败");
    } finally {
      setShipSubmitting(false);
    }
  };

  const onAppendTrack = async (values: {
    content: string;
    location?: string;
    status?: "pending_pickup" | "in_transit" | "signed" | "exception";
  }) => {
    if (!trackModalOrder) return;
    setTrackSubmitting(true);
    try {
      await api.post(`/admin/orders/${trackModalOrder.id}/tracks`, values, { headers });
      message.success("物流轨迹已更新");
      setTrackModalOrder(null);
      trackForm.resetFields();
      await loadOrders();
    } catch {
      message.error("物流轨迹更新失败");
    } finally {
      setTrackSubmitting(false);
    }
  };

  const productColumns: ColumnsType<ProductRow> = [
    { title: "商品ID", dataIndex: "id", width: 220 },
    { title: "商品名", dataIndex: "title" },
    { title: "副标题", dataIndex: "subtitle", ellipsis: true },
    { title: "分类", dataIndex: "categoryId", width: 140 },
    { title: "推荐", dataIndex: "recommended", render: (v: boolean) => (v ? <Tag color="blue">推荐</Tag> : <Tag>普通</Tag>) },
    { title: "销量", dataIndex: "sales", width: 80 },
    {
      title: "上架",
      render: (_, row) => <Switch checked={row.enabled} onChange={(checked) => void toggleProductEnabled(row, checked)} />,
    },
    {
      title: "SKU",
      dataIndex: "skus",
      render: (rows: ProductRow["skus"]) =>
        rows.map((row) => (
          <div key={row.id}>
            {row.name} / ¥{(row.priceCents / 100).toFixed(2)} / 库存 {row.stock}
          </div>
        )),
    },
    {
      title: "操作",
      render: (_, row) => (
        <Space>
          <Button onClick={() => openEditProduct(row)}>编辑</Button>
          <Popconfirm
            title="确认删除该商品？"
            description="若该商品有关联订单将无法删除"
            okText="删除"
            cancelText="取消"
            onConfirm={() => void removeProduct(row.id)}
          >
            <Button danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const categoryColumns: ColumnsType<CategoryRow> = [
    { title: "分类ID", dataIndex: "id", width: 220 },
    { title: "分类名", dataIndex: "name" },
    { title: "父级", dataIndex: "parentId", render: (v?: string | null) => v || "-" },
    { title: "排序", dataIndex: "sort", width: 100 },
    { title: "状态", dataIndex: "enabled", render: (v: boolean) => (v ? <Tag color="green">启用</Tag> : <Tag>禁用</Tag>) },
    {
      title: "操作",
      render: (_, row) => (
        <Space>
          <Button onClick={() => openEditCategory(row)}>编辑</Button>
          <Popconfirm
            title="确认删除该分类？"
            description="若该分类下有商品将无法删除"
            okText="删除"
            cancelText="取消"
            onConfirm={() => void removeCategory(row.id)}
          >
            <Button danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const orderColumns: ColumnsType<OrderRow> = [
    { title: "订单号", dataIndex: "orderNo", width: 220 },
    { title: "用户", render: (_, row) => row.user?.nickname ?? "-" },
    { title: "手机", render: (_, row) => row.user?.phone ?? "-" },
    { title: "状态", dataIndex: "status", render: (s: string) => <Tag color={statusColor(s)}>{s}</Tag> },
    { title: "金额", dataIndex: "payableAmountCents", render: (v: number) => `¥${(v / 100).toFixed(2)}` },
    { title: "物流", render: (_, row) => (row.shipment ? `${row.shipment.company} ${row.shipment.trackingNo}` : "-") },
    {
      title: "操作",
      render: (_, row) => (
        <Space>
          <Button size="small" disabled={row.status !== "paid_pending_shipment"} onClick={() => setShipModalOrder(row)}>
            发货
          </Button>
          <Button
            size="small"
            disabled={!row.shipment || !["shipped", "completed"].includes(row.status)}
            onClick={() => {
              setTrackModalOrder(row);
              trackForm.setFieldsValue({ status: row.shipment?.status || "in_transit" });
            }}
          >
            更新物流
          </Button>
        </Space>
      ),
    },
  ];

  const bannerColumns: ColumnsType<BannerRow> = [
    { title: "轮播ID", dataIndex: "id", width: 220 },
    { title: "标题", dataIndex: "title" },
    { title: "图片", dataIndex: "image", render: (v: string) => <Text copyable>{v}</Text> },
    { title: "类型", dataIndex: "targetType" },
    { title: "目标ID", dataIndex: "targetId" },
    { title: "排序", dataIndex: "sort", width: 100 },
    { title: "状态", dataIndex: "enabled", render: (v: boolean) => (v ? <Tag color="green">启用</Tag> : <Tag>禁用</Tag>) },
    {
      title: "操作",
      render: (_, row) => (
        <Space>
          <Button onClick={() => openEditBanner(row)}>编辑</Button>
          <Popconfirm
            title="确认删除该轮播？"
            okText="删除"
            cancelText="取消"
            onConfirm={() => void removeBanner(row.id)}
          >
            <Button danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const userColumns: ColumnsType<UserRow> = [
    { title: "用户ID", dataIndex: "id", width: 220 },
    { title: "昵称", dataIndex: "nickname" },
    { title: "手机号", dataIndex: "phone", render: (v?: string) => v ?? "-" },
    { title: "订单数", dataIndex: "orderCount", width: 100 },
    { title: "累计支付", dataIndex: "paidAmountCents", render: (v: number) => `¥${(v / 100).toFixed(2)}` },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider theme="dark">
        <div style={{ color: "#fff", padding: 16, fontWeight: 700 }}>商城后台</div>
        <Menu
          theme="dark"
          selectedKeys={[activeMenu]}
          onClick={(e) => setActiveMenu(e.key as MenuKey)}
          items={[
            { key: "dashboard", label: "数据看板" },
            { key: "products", label: "商品管理" },
            { key: "categories", label: "分类管理" },
            { key: "orders", label: "订单管理" },
            { key: "banners", label: "轮播管理" },
            { key: "users", label: "用户管理" },
          ]}
        />
      </Sider>
      <Layout>
        <Header style={{ background: "#fff", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Title level={4} style={{ margin: 0 }}>
            微信小程序商城管理后台
          </Title>
          <Space>
            <Button onClick={() => void refreshActive()} loading={loading}>
              刷新
            </Button>
            <Button danger onClick={props.onLogout}>
              退出
            </Button>
          </Space>
        </Header>
        <Content style={{ padding: 20 }}>
          {activeMenu === "dashboard" && (
            <>
              <Row gutter={16}>
                <Col span={8}>
                  <Card>
                    <Statistic title="总订单" value={stats?.totalOrders ?? 0} />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card>
                    <Statistic title="已支付订单" value={stats?.paidOrders ?? 0} />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card>
                    <Statistic title="支付金额(元)" value={(stats?.totalPaidAmountCents ?? 0) / 100} precision={2} />
                  </Card>
                </Col>
              </Row>
              <Card style={{ marginTop: 20 }} title="热销商品">
                <Table
                  rowKey="id"
                  pagination={false}
                  dataSource={stats?.topProducts ?? []}
                  columns={[
                    { title: "商品ID", dataIndex: "id" },
                    { title: "商品名", dataIndex: "title" },
                    { title: "销量", dataIndex: "sales" },
                  ]}
                />
              </Card>
            </>
          )}

          {activeMenu === "products" && (
            <Card
              title="商品管理"
              extra={
                <Button type="primary" onClick={openCreateProduct}>
                  新增商品
                </Button>
              }
            >
              <Table rowKey="id" dataSource={products} columns={productColumns} />
            </Card>
          )}

          {activeMenu === "categories" && (
            <Card
              title="分类管理"
              extra={
                <Button type="primary" onClick={openCreateCategory}>
                  新增分类
                </Button>
              }
            >
              <Table rowKey="id" dataSource={categories} columns={categoryColumns} />
            </Card>
          )}

          {activeMenu === "orders" && (
            <Card title="订单管理">
              <Table rowKey="id" dataSource={orders} columns={orderColumns} />
            </Card>
          )}

          {activeMenu === "banners" && (
            <Card
              title="轮播管理"
              extra={
                <Button type="primary" onClick={openCreateBanner}>
                  新增轮播
                </Button>
              }
            >
              <Table rowKey="id" dataSource={banners} columns={bannerColumns} />
            </Card>
          )}

          {activeMenu === "users" && (
            <Card title="用户管理">
              <Table rowKey="id" dataSource={users} columns={userColumns} />
            </Card>
          )}
        </Content>
      </Layout>

      <Modal open={Boolean(shipModalOrder)} title="订单发货" footer={null} onCancel={() => setShipModalOrder(null)} destroyOnClose>
        <Form layout="vertical" onFinish={onShip}>
          <Form.Item label="快递公司" name="company" rules={[{ required: true }]}>
            <Input placeholder="例如 顺丰速运" />
          </Form.Item>
          <Form.Item label="快递公司编码" name="companyCode">
            <Input placeholder="例如 SF" />
          </Form.Item>
          <Form.Item label="快递单号" name="trackingNo" rules={[{ required: true }]}>
            <Input placeholder="请输入快递单号" />
          </Form.Item>
          <Form.Item label="预计送达时间(ISO)" name="expectedDeliveryAt">
            <Input placeholder="例如 2026-04-25T10:00:00.000Z" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={shipSubmitting} block>
            确认发货
          </Button>
        </Form>
      </Modal>

      <Modal open={Boolean(trackModalOrder)} title="更新物流轨迹" footer={null} onCancel={() => setTrackModalOrder(null)} destroyOnClose>
        <Form form={trackForm} layout="vertical" onFinish={onAppendTrack}>
          <Form.Item label="轨迹内容" name="content" rules={[{ required: true }]}>
            <Input placeholder="例如 快件已到达上海转运中心" />
          </Form.Item>
          <Form.Item label="当前位置" name="location">
            <Input placeholder="例如 上海市浦东新区" />
          </Form.Item>
          <Form.Item label="物流状态" name="status">
            <Select
              options={[
                { label: "待揽收", value: "pending_pickup" },
                { label: "运输中", value: "in_transit" },
                { label: "已签收", value: "signed" },
                { label: "异常", value: "exception" },
              ]}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={trackSubmitting} block>
            保存轨迹
          </Button>
        </Form>
      </Modal>

      <Modal
        open={productModalOpen}
        title={editingProduct ? "编辑商品" : "新增商品"}
        onCancel={() => {
          setEditingProduct(null);
          setProductModalOpen(false);
          productForm.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form form={productForm} layout="vertical" onFinish={saveProduct}>
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>
          <Form.Item label="分类" name="categoryId" rules={[{ required: true }]}>
            <Select options={categories.map((c) => ({ label: c.name, value: c.id }))} />
          </Form.Item>
          <Form.Item label="商品名" name="title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="副标题" name="subtitle">
            <Input />
          </Form.Item>
          <Form.Item label="封面图 URL" name="cover">
            <Input />
          </Form.Item>
          <Form.Item label="图片列表（每行一个 URL）" name="imagesText">
            <TextArea rows={3} />
          </Form.Item>
          <Form.Item label="详情" name="detail">
            <TextArea rows={3} />
          </Form.Item>
          <Form.Item label="SKU JSON 数组" name="skusText" rules={[{ required: true }]}>
            <TextArea rows={8} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="上架" name="enabled" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="推荐" name="recommended" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
          <Button type="primary" htmlType="submit" loading={saving} block>
            保存商品
          </Button>
        </Form>
      </Modal>

      <Modal
        open={categoryModalOpen}
        title={editingCategory ? "编辑分类" : "新增分类"}
        onCancel={() => {
          setEditingCategory(null);
          setCategoryModalOpen(false);
          categoryForm.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form form={categoryForm} layout="vertical" onFinish={saveCategory}>
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>
          <Form.Item label="分类名" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="父级分类" name="parentId">
            <Select allowClear options={categories.map((c) => ({ label: c.name, value: c.id }))} />
          </Form.Item>
          <Form.Item label="排序" name="sort" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="启用" name="enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={saving} block>
            保存分类
          </Button>
        </Form>
      </Modal>

      <Modal
        open={bannerModalOpen}
        title={editingBanner ? "编辑轮播" : "新增轮播"}
        onCancel={() => {
          setEditingBanner(null);
          setBannerModalOpen(false);
          bannerForm.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form form={bannerForm} layout="vertical" onFinish={saveBanner}>
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>
          <Form.Item label="标题" name="title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="图片 URL" name="image" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="目标类型" name="targetType" rules={[{ required: true }]}>
            <Select
              options={[
                { label: "商品", value: "product" },
                { label: "分类", value: "category" },
                { label: "活动", value: "activity" },
              ]}
            />
          </Form.Item>
          <Form.Item label="目标 ID" name="targetId" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="排序" name="sort" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="启用" name="enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={saving} block>
            保存轮播
          </Button>
        </Form>
      </Modal>
    </Layout>
  );
}

function Root() {
  const [token, setToken] = useState<string>(() => localStorage.getItem("admin_token") ?? "");

  const onLogin = (nextToken: string) => {
    localStorage.setItem("admin_token", nextToken);
    setToken(nextToken);
  };

  const onLogout = () => {
    localStorage.removeItem("admin_token");
    setToken("");
  };

  return token ? <AdminView token={token} onLogout={onLogout} /> : <LoginView onLogin={onLogin} />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AntApp>
      <Root />
    </AntApp>
  </React.StrictMode>,
);
